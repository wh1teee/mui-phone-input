import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { chromium } from '@playwright/test';

import { createPackageArtifact, run } from './lib/package-artifact.mjs';

const supportMatrix = process.env.SUPPORT_MATRIX ?? 'latest';
const productionDependencyPolicy = JSON.parse(
  await readFile(
    new URL('../docs/security/production-dependency-policy.json', import.meta.url),
    'utf8',
  ),
);
const matrices = {
  latest: {
    '@emotion/react': '11.14.0',
    '@emotion/styled': '11.14.1',
    '@mui/material': '9.2.0',
    react: '19.2.8',
    'react-dom': '19.2.8',
  },
  minimum: {
    '@emotion/react': '11.14.0',
    '@emotion/styled': '11.14.1',
    '@mui/material': '9.0.0',
    react: '19.0.0',
    'react-dom': '19.0.0',
  },
};

if (!(supportMatrix in matrices)) {
  throw new Error(`Unknown SUPPORT_MATRIX: ${supportMatrix}`);
}

const tarball = await createPackageArtifact();
const temporaryRoot = await mkdtemp(join(tmpdir(), 'mui-phone-input-consumers-'));

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to allocate a consumer verification port.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

async function waitForServer(url, process, readLogs) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(
        `Consumer server exited with status ${process.exitCode}.\n${readLogs()}`,
      );
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server startup is expected to refuse connections briefly.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Consumer server did not become ready at ${url}.\n${readLogs()}`);
}

async function stopServer(process) {
  if (process.exitCode !== null) {
    return;
  }

  process.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => process.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);

  if (process.exitCode === null) {
    process.kill('SIGKILL');
  }
}

const SSR_STATE_EXPECTATIONS = {
  empty: {
    accepted: 'true',
    country: '',
    plan: 'unresolved',
    placeholder: 'Empty phone',
    status: 'empty',
    value: '',
  },
  'explicit-draft': {
    accepted: 'false',
    country: 'US',
    plan: 'geographic',
    placeholder: 'Explicit draft phone',
    status: 'incomplete',
    value: '+12015550',
  },
  geographic: {
    accepted: 'true',
    country: '',
    plan: 'geographic',
    placeholder: 'Geographic phone',
    status: 'valid',
    value: '+375291234567',
  },
  'non-geographic': {
    accepted: 'true',
    country: '',
    plan: 'non-geographic',
    placeholder: 'Non-geographic phone',
    status: 'valid',
    value: '+80012345678',
  },
  unresolved: {
    accepted: 'false',
    country: '',
    plan: 'unresolved',
    placeholder: 'Unresolved phone',
    status: 'incomplete',
    value: '+1',
  },
  territory: {
    accepted: 'true',
    country: 'AX',
    plan: 'geographic',
    placeholder: 'Territory phone',
    status: 'valid',
    value: '+358412345678',
  },
};

async function collectSsrStateSnapshot(page) {
  const snapshot = {};

  for (const [kind, expectation] of Object.entries(SSR_STATE_EXPECTATIONS)) {
    const input = page.getByTestId(`ssr-${kind}-input`);
    const trigger = page.getByTestId(`ssr-${kind}-country`);
    await input.waitFor({ state: 'visible' });
    snapshot[kind] = {
      accepted: await input.getAttribute('data-phone-input-accepted'),
      country: await input.getAttribute('data-phone-input-country'),
      invalid: await input.getAttribute('aria-invalid'),
      placeholder: await input.getAttribute('placeholder'),
      plan: await input.getAttribute('data-phone-input-plan'),
      status: await input.getAttribute('data-phone-input-status'),
      triggerLabel: await trigger.getAttribute('aria-label'),
      triggerText: (await trigger.textContent())?.replace(/\s+/gu, ' ').trim(),
      value: await input.inputValue(),
    };

    assert.deepEqual(
      {
        accepted: snapshot[kind].accepted,
        country: snapshot[kind].country,
        placeholder: snapshot[kind].placeholder,
        plan: snapshot[kind].plan,
        status: snapshot[kind].status,
        value: snapshot[kind].value,
      },
      expectation,
      `Unexpected ${kind} consumer state.`,
    );
  }

  return snapshot;
}

async function verifyPackedBrowser(destination, consumer) {
  const port = await reservePort();
  const url = `http://127.0.0.1:${port}`;
  const args =
    consumer === 'next-consumer'
      ? [
          '--dir',
          destination,
          'exec',
          'next',
          'start',
          '--hostname',
          '127.0.0.1',
          '--port',
          String(port),
        ]
      : [
          '--dir',
          destination,
          'exec',
          'vite',
          'preview',
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--strictPort',
        ];
  const serverProcess = spawn('pnpm', args, {
    cwd: destination,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  const captureLogs = (chunk) => {
    logs = `${logs}${chunk}`.slice(-16_000);
  };
  serverProcess.stdout.on('data', captureLogs);
  serverProcess.stderr.on('data', captureLogs);

  let browser;
  try {
    await waitForServer(url, serverProcess, () => logs);
    browser = await chromium.launch({ headless: true });
    let serverSnapshot;
    if (consumer === 'next-consumer') {
      const serverContext = await browser.newContext({ javaScriptEnabled: false });
      try {
        const serverPage = await serverContext.newPage();
        await serverPage.goto(url, { waitUntil: 'domcontentloaded' });
        serverSnapshot = await collectSsrStateSnapshot(serverPage);
        assert.equal(
          await serverPage.getByTestId('hydration-marker').textContent(),
          'server',
        );
        assert.equal(
          await serverPage
            .getByTestId('responsive-country-selector-trigger')
            .getAttribute('aria-haspopup'),
          'listbox',
          'The server snapshot must use deterministic desktop selector semantics.',
        );
        assert.deepEqual(
          JSON.parse(
            (await serverPage.getByTestId('server-plan-matrix').textContent()) || '{}',
          ),
          {
            empty: 'unresolved',
            geographic: 'geographic',
            nonGeographic: 'non-geographic',
            territory: 'geographic',
            unresolved: 'unresolved',
          },
        );
      } finally {
        await serverContext.close();
      }
    }

    const mobileContext = await browser.newContext({
      viewport: { height: 844, width: 390 },
    });
    try {
      const mobilePage = await mobileContext.newPage();
      const mobilePageErrors = [];
      const mobileConsoleErrors = [];
      mobilePage.on('pageerror', (error) => mobilePageErrors.push(error));
      mobilePage.on('console', (message) => {
        if (message.type() === 'error') {
          mobileConsoleErrors.push(message.text());
        }
      });

      await mobilePage.goto(url, { waitUntil: 'networkidle' });
      await mobilePage.getByTestId('hydration-marker').waitFor({ state: 'visible' });
      await mobilePage
        .getByTestId('hydration-marker')
        .filter({ hasText: 'hydrated' })
        .waitFor();
      const responsiveTrigger = mobilePage.getByTestId(
        'responsive-country-selector-trigger',
      );
      await responsiveTrigger.waitFor({ state: 'visible' });
      await mobilePage.waitForFunction(() => {
        return (
          document
            .querySelector('[data-testid="responsive-country-selector-trigger"]')
            ?.getAttribute('aria-haspopup') === 'dialog'
        );
      });
      await responsiveTrigger.click();
      await mobilePage
        .getByRole('dialog', { name: 'Select country' })
        .waitFor({ state: 'visible' });
      if (mobilePageErrors.length > 0) {
        throw new Error(
          `Packed mobile consumer page errors: ${mobilePageErrors.join('\n')}`,
        );
      }
      if (mobileConsoleErrors.length > 0) {
        throw new Error(
          `Packed mobile consumer console errors: ${mobileConsoleErrors.join('\n')}`,
        );
      }
    } finally {
      await mobileContext.close();
    }

    const page = await browser.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });

    await page.goto(url, { waitUntil: 'networkidle' });
    await page.getByTestId('hydration-marker').waitFor({ state: 'visible' });
    await page
      .getByTestId('hydration-marker')
      .filter({ hasText: 'hydrated' })
      .waitFor();
    const hydratedSnapshot = await collectSsrStateSnapshot(page);
    if (consumer === 'next-consumer') {
      assert.deepEqual(
        hydratedSnapshot,
        serverSnapshot,
        'Next.js server HTML and hydrated phone states diverged.',
      );
    } else {
      assert.equal(
        await page.getByTestId('server-plan-matrix').textContent(),
        'non-geographic',
      );
    }
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid="controlled-initial-country-events"]')
        ?.textContent?.includes('"reason":"external-value"'),
    );
    const initialControlledCountryEvents = JSON.parse(
      (await page.getByTestId('controlled-initial-country-events').textContent()) ||
        '[]',
    );
    if (
      initialControlledCountryEvents.length !== 1 ||
      initialControlledCountryEvents[0]?.country !== 'BY' ||
      initialControlledCountryEvents[0]?.previousCountry !== null ||
      initialControlledCountryEvents[0]?.reason !== 'external-value' ||
      initialControlledCountryEvents[0]?.value !== '+375291234567' ||
      (await page.getByTestId('controlled-initial-country-input').inputValue()) !==
        '+375291234567'
    ) {
      throw new Error(
        `Packed controlled initial country transition is invalid: ${JSON.stringify(initialControlledCountryEvents)}`,
      );
    }
    const input = page.getByTestId('phone-input');
    await input.pressSequentially('37529');
    await input.waitFor({ state: 'visible' });

    if ((await input.inputValue()) !== '+37529') {
      throw new Error(`Unexpected packed input value: ${await input.inputValue()}`);
    }
    if ((await page.getByTestId('phone-value').textContent()) !== '+37529') {
      throw new Error('Packed consumer did not expose the canonical Phone Value.');
    }
    if ((await page.getByTestId('callback-count').textContent()) !== '5') {
      throw new Error(
        'Packed consumer emitted an unexpected callback count after typing.',
      );
    }

    const details = JSON.parse(
      (await page.getByTestId('change-details').textContent()) || '{}',
    );
    if (
      details.value !== '+37529' ||
      details.previousValue !== '+3752' ||
      details.reason !== 'input' ||
      details.validation?.accepted !== false ||
      details.validation?.status !== 'incomplete' ||
      details.validation?.reason !== 'too-short' ||
      details.numberingPlan?.kind !== 'geographic' ||
      details.numberingPlan?.countryCallingCode !== '375' ||
      details.numberingPlan?.detectedCountry !== 'BY' ||
      details.numberingPlan?.resolvedCountry !== 'BY' ||
      details.numberingPlan?.selectedCountry !== null ||
      JSON.stringify(details.numberingPlan?.possibleCountries) !== '["BY"]' ||
      'nativeEvent' in details ||
      'target' in details
    ) {
      throw new Error(
        `Packed callback details are invalid: ${JSON.stringify(details)}`,
      );
    }

    if ((await input.getAttribute('aria-invalid')) === 'true') {
      throw new Error('Packed incomplete value displayed validation before blur.');
    }

    await page.getByRole('button', { name: 'Focus phone input' }).click();
    if (!(await input.evaluate((element) => element === document.activeElement))) {
      throw new Error('Packed input ref did not focus the native input.');
    }
    await page.getByText('Complete the phone number.').waitFor({ state: 'visible' });
    if ((await input.getAttribute('aria-invalid')) !== 'true') {
      throw new Error('Packed incomplete value did not expose blur validation.');
    }

    await input.selectText();
    await input.press('Backspace');
    if ((await input.inputValue()) !== '') {
      throw new Error('Packed input did not clear to the empty state.');
    }
    if ((await page.getByTestId('callback-count').textContent()) !== '6') {
      throw new Error('Packed clear transaction did not emit exactly one callback.');
    }

    await input.pressSequentially('1');
    if ((await page.getByTestId('callback-count').textContent()) !== '7') {
      throw new Error('Packed shared-code input emitted a duplicate callback.');
    }
    const unresolvedDetails = JSON.parse(
      (await page.getByTestId('change-details').textContent()) || '{}',
    );
    if (
      unresolvedDetails.numberingPlan?.kind !== 'unresolved' ||
      unresolvedDetails.numberingPlan?.countryCallingCode !== '1' ||
      unresolvedDetails.numberingPlan?.possibleCountries?.length !== 25 ||
      !unresolvedDetails.numberingPlan.possibleCountries.includes('CA') ||
      !unresolvedDetails.numberingPlan.possibleCountries.includes('US')
    ) {
      throw new Error(
        `Packed unresolved numbering plan is invalid: ${JSON.stringify(unresolvedDetails)}`,
      );
    }
    if (
      unresolvedDetails.validation?.accepted !== false ||
      unresolvedDetails.validation?.status !== 'incomplete' ||
      unresolvedDetails.validation?.reason !== 'too-short'
    ) {
      throw new Error(
        `Packed unresolved validation is invalid: ${JSON.stringify(unresolvedDetails)}`,
      );
    }

    await input.pressSequentially('2025550123');
    if ((await page.getByTestId('callback-count').textContent()) !== '17') {
      throw new Error('Packed resolved-country input emitted duplicate callbacks.');
    }
    const resolvedDetails = JSON.parse(
      (await page.getByTestId('change-details').textContent()) || '{}',
    );
    if (
      resolvedDetails.numberingPlan?.kind !== 'geographic' ||
      resolvedDetails.numberingPlan?.detectedCountry !== 'US' ||
      resolvedDetails.numberingPlan?.resolvedCountry !== 'US' ||
      JSON.stringify(resolvedDetails.numberingPlan?.possibleCountries) !== '["US"]' ||
      resolvedDetails.validation?.accepted !== true ||
      resolvedDetails.validation?.status !== 'valid' ||
      resolvedDetails.validation?.reason !== 'valid' ||
      resolvedDetails.validation?.numberType !== 'FIXED_LINE_OR_MOBILE'
    ) {
      throw new Error(
        `Packed resolved numbering plan is invalid: ${JSON.stringify(resolvedDetails)}`,
      );
    }

    await input.selectText();
    await input.press('Backspace');
    await input.pressSequentially('80012345678');
    if ((await page.getByTestId('callback-count').textContent()) !== '29') {
      throw new Error('Packed non-geographic input emitted duplicate callbacks.');
    }
    const nonGeographicDetails = JSON.parse(
      (await page.getByTestId('change-details').textContent()) || '{}',
    );
    if (
      nonGeographicDetails.numberingPlan?.kind !== 'non-geographic' ||
      nonGeographicDetails.numberingPlan?.countryCallingCode !== '800' ||
      nonGeographicDetails.numberingPlan?.detectedCountry !== null ||
      nonGeographicDetails.numberingPlan?.resolvedCountry !== null ||
      nonGeographicDetails.numberingPlan?.selectedCountry !== null ||
      JSON.stringify(nonGeographicDetails.numberingPlan?.possibleCountries) !== '[]' ||
      nonGeographicDetails.validation?.accepted !== true ||
      nonGeographicDetails.validation?.status !== 'valid' ||
      nonGeographicDetails.validation?.numberType !== 'TOLL_FREE'
    ) {
      throw new Error(
        `Packed non-geographic numbering plan is invalid: ${JSON.stringify(nonGeographicDetails)}`,
      );
    }
    await page.getByRole('button', { name: 'Reset phone input' }).click();
    if ((await input.inputValue()) !== '') {
      throw new Error('Packed external reset did not clear the display.');
    }
    if ((await page.getByTestId('callback-count').textContent()) !== '29') {
      throw new Error('Packed external reset emitted a callback loop.');
    }

    await input.pressSequentially('37');
    if (
      (await input.inputValue()) !== '+37' ||
      (await page.getByTestId('callback-count').textContent()) !== '31'
    ) {
      throw new Error('Packed partial international prefix is incoherent.');
    }

    const countryTrigger = page.getByTestId('country-selector-trigger');
    await countryTrigger.click();
    const countrySearch = page.getByRole('combobox', { name: 'Search countries' });
    await countrySearch.fill('BY');
    const packedCountryOption = page.locator(
      '[role="option"][data-country="BY"][data-packed-slot-country="BY"]',
    );
    await packedCountryOption.waitFor();
    if (
      (await packedCountryOption.getAttribute('data-testid')) !==
        'packed-country-option-BY' ||
      (await packedCountryOption.getAttribute('aria-label')) !== 'Belarus, BY, +375'
    ) {
      throw new Error('Packed semantic Country Selector option slot is invalid.');
    }
    await countrySearch.press('Enter');
    if (
      (await input.inputValue()) !== '+375' ||
      (await page.getByTestId('callback-count').textContent()) !== '32'
    ) {
      throw new Error('Packed MuiPhoneInput country selection is incoherent.');
    }
    const countryDetails = JSON.parse(
      (await page.getByTestId('change-details').textContent()) || '{}',
    );
    if (
      countryDetails.reason !== 'country-selection' ||
      countryDetails.value !== '+375' ||
      countryDetails.numberingPlan?.selectedCountry !== 'BY' ||
      countryDetails.numberingPlan?.resolvedCountry !== 'BY'
    ) {
      throw new Error(
        `Packed MuiPhoneInput country details are invalid: ${JSON.stringify(countryDetails)}`,
      );
    }
    const countryChangeDetails = JSON.parse(
      (await page.getByTestId('country-change-details').textContent()) || '{}',
    );
    if (
      countryChangeDetails.country !== 'BY' ||
      countryChangeDetails.previousCountry !== null ||
      countryChangeDetails.reason !== 'user' ||
      countryChangeDetails.numberingPlan?.selectedCountry !== 'BY' ||
      countryChangeDetails.numberingPlan?.resolvedCountry !== 'BY' ||
      countryChangeDetails.previousNumberingPlan?.kind !== 'unresolved'
    ) {
      throw new Error(
        `Packed country-change details are invalid: ${JSON.stringify(countryChangeDetails)}`,
      );
    }
    const countrySelectionDetails = JSON.parse(
      (await page.getByTestId('country-selection-details').textContent()) || '{}',
    );
    if (
      countrySelectionDetails.country !== 'BY' ||
      countrySelectionDetails.previousValue !== '+37' ||
      countrySelectionDetails.candidateValue !== '+375' ||
      countrySelectionDetails.value !== '+375' ||
      countrySelectionDetails.reason !== 'partial-calling-code-replaced' ||
      countrySelectionDetails.status !== 'applied' ||
      countrySelectionDetails.numberingPlan?.selectedCountry !== 'BY'
    ) {
      throw new Error(
        `Packed country-selection result is invalid: ${JSON.stringify(countrySelectionDetails)}`,
      );
    }
    await page.waitForFunction(
      () =>
        document.activeElement?.getAttribute('data-testid') ===
        'country-selector-trigger',
      undefined,
      { timeout: 3_000 },
    );

    await page.getByRole('button', { name: 'Load impossible country source' }).click();
    await page.waitForFunction(
      () =>
        document.querySelector('[data-testid="phone-input"]')?.value === '+24740123',
    );
    const callbackCountBeforeConflict = await page
      .getByTestId('callback-count')
      .textContent();
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid="country-change-details"]')
        ?.textContent?.includes('"value":"+24740123"'),
    );
    const countryChangeBeforeConflict = await page
      .getByTestId('country-change-details')
      .textContent();

    await countryTrigger.click();
    await countrySearch.fill('AZ');
    const impossibleCountryOption = page.locator(
      '[role="option"][data-country="AZ"][data-packed-slot-country="AZ"]',
    );
    await impossibleCountryOption.waitFor();
    await countrySearch.press('Enter');
    await page.waitForFunction(() =>
      document
        .querySelector('[data-testid="country-selection-details"]')
        ?.textContent?.includes('"reason":"impossible-target-draft"'),
    );

    if (
      (await input.inputValue()) !== '+24740123' ||
      (await page.getByTestId('phone-value').textContent()) !== '+24740123' ||
      (await page.getByTestId('callback-count').textContent()) !==
        callbackCountBeforeConflict ||
      (await page.getByTestId('country-change-details').textContent()) !==
        countryChangeBeforeConflict
    ) {
      throw new Error('Packed impossible country selection mutated committed state.');
    }
    const impossibleSelectionDetails = JSON.parse(
      (await page.getByTestId('country-selection-details').textContent()) || '{}',
    );
    if (
      impossibleSelectionDetails.country !== 'AZ' ||
      impossibleSelectionDetails.previousValue !== '+24740123' ||
      impossibleSelectionDetails.candidateValue !== '+99440123' ||
      impossibleSelectionDetails.value !== '+24740123' ||
      impossibleSelectionDetails.reason !== 'impossible-target-draft' ||
      impossibleSelectionDetails.status !== 'conflict'
    ) {
      throw new Error(
        `Packed impossible country-selection result is invalid: ${JSON.stringify(impossibleSelectionDetails)}`,
      );
    }

    const composableRoot = page.getByTestId('composable-root');
    const composableInput = page.getByTestId('composable-input');
    await composableInput.waitFor({ state: 'visible' });
    if ((await composableInput.inputValue()) !== '+1') {
      throw new Error('Packed composable input did not preserve its default value.');
    }
    if (
      !(await composableRoot.getAttribute('class'))?.includes('MuiPhoneInput-root') ||
      !(await composableInput.getAttribute('class'))?.includes('MuiPhoneInput-input')
    ) {
      throw new Error('Packed composable primitives did not expose utility classes.');
    }
    if (
      (await composableInput.getAttribute('data-phone-input-status')) !==
        'incomplete' ||
      (await composableInput.getAttribute('data-phone-input-plan')) !== 'unresolved' ||
      (await composableInput.getAttribute('data-phone-input-accepted')) !== 'false'
    ) {
      throw new Error('Packed composable input did not expose prepared state props.');
    }

    await composableInput.evaluate((element) => {
      if (!(element instanceof HTMLInputElement)) {
        throw new TypeError('Expected the packed composable native input.');
      }
      element.focus();
      element.setSelectionRange(element.value.length, element.value.length);
    });
    await composableInput.pressSequentially('2025550123');
    if ((await composableInput.inputValue()) !== '+12025550123') {
      throw new Error(
        `Packed composable input did not commit the Phone Value: ${JSON.stringify({
          callbackCount: await page
            .getByTestId('composable-callback-count')
            .textContent(),
          state: await page.getByTestId('composable-state').textContent(),
          value: await composableInput.inputValue(),
        })}`,
      );
    }
    if (
      (await page.getByTestId('composable-value').textContent()) !== '+12025550123' ||
      (await page.getByTestId('composable-callback-count').textContent()) !== '10'
    ) {
      throw new Error(
        'Packed composable controller state or callback count is invalid.',
      );
    }
    const composableState = JSON.parse(
      (await page.getByTestId('composable-state').textContent()) || '{}',
    );
    if (
      composableState.controlled !== false ||
      composableState.numberingPlan?.resolvedCountry !== 'US' ||
      composableState.validation?.status !== 'valid' ||
      composableState.validation?.accepted !== true
    ) {
      throw new Error(
        `Packed composable controller state is invalid: ${JSON.stringify(composableState)}`,
      );
    }

    await page.getByRole('button', { name: 'Focus composable input' }).click();
    if (
      !(await composableInput.evaluate((element) => element === document.activeElement))
    ) {
      throw new Error('Packed composable focus action did not focus the native input.');
    }
    await page.getByRole('button', { name: 'Clear composable input' }).click();
    if (
      (await composableInput.inputValue()) !== '' ||
      (await page.getByTestId('composable-callback-count').textContent()) !== '11'
    ) {
      throw new Error('Packed composable clear action is incoherent.');
    }
    await page.getByRole('button', { name: 'Reset composable input' }).click();
    if (
      (await composableInput.inputValue()) !== '+1' ||
      (await page.getByTestId('composable-callback-count').textContent()) !== '11'
    ) {
      throw new Error('Packed composable reset action emitted a callback loop.');
    }

    const composableCountryTrigger = page.getByTestId('composable-country-trigger');
    await composableCountryTrigger.click();
    const composableCountrySearch = page.getByRole('combobox', {
      name: 'Search countries',
    });
    await composableCountrySearch.fill('+375');
    await page.locator('[role="option"][data-country="BY"]').waitFor();
    await composableCountrySearch.press('Enter');
    if (
      (await composableInput.inputValue()) !== '+375' ||
      (await page.getByTestId('composable-callback-count').textContent()) !== '12'
    ) {
      throw new Error('Packed composable country selection is incoherent.');
    }
    const countryState = JSON.parse(
      (await page.getByTestId('composable-state').textContent()) || '{}',
    );
    if (
      countryState.selectedCountry !== 'BY' ||
      countryState.numberingPlan?.selectedCountry !== 'BY' ||
      countryState.numberingPlan?.resolvedCountry !== 'BY'
    ) {
      throw new Error(
        `Packed composable country state is invalid: ${JSON.stringify(countryState)}`,
      );
    }
    if (pageErrors.length > 0) {
      throw new Error(`Packed consumer page errors: ${pageErrors.join('\n')}`);
    }
    if (consoleErrors.length > 0) {
      throw new Error(`Packed consumer console errors: ${consoleErrors.join('\n')}`);
    }
  } finally {
    await browser?.close();
    await stopServer(serverProcess);
  }
}

try {
  const requestedConsumer = process.env.CONSUMER;
  const consumers = requestedConsumer
    ? [requestedConsumer]
    : ['next-consumer', 'vite-consumer'];

  for (const consumer of consumers) {
    if (!['next-consumer', 'vite-consumer'].includes(consumer)) {
      throw new Error(`Unknown CONSUMER: ${consumer}`);
    }
    const source = new URL(`../apps/${consumer}/`, import.meta.url);
    const destination = join(temporaryRoot, consumer);
    await cp(source, destination, { recursive: true });

    const packagePath = join(destination, 'package.json');
    const packageManifest = JSON.parse(await readFile(packagePath, 'utf8'));
    packageManifest.dependencies = {
      ...packageManifest.dependencies,
      ...matrices[supportMatrix],
      '@whiteee/mui-phone-input': `file:${tarball}`,
    };
    if (consumer === 'next-consumer') {
      Object.assign(
        packageManifest.dependencies,
        supportMatrix === 'minimum'
          ? {
              '@emotion/cache': '11.14.0',
              '@mui/material-nextjs': '9.0.0',
            }
          : {
              '@emotion/cache': '11.14.0',
              '@mui/material-nextjs': '9.1.1',
            },
      );
    }
    await writeFile(packagePath, `${JSON.stringify(packageManifest, null, 2)}\n`);
    const consumerWorkspacePolicy = [
      'packages:',
      '  - .',
      '',
      'allowBuilds:',
      '  sharp: true',
      'autoInstallPeers: false',
      'minimumReleaseAge: 1440',
    ];
    if (consumer === 'next-consumer') {
      consumerWorkspacePolicy.push(
        'overrides:',
        `  "next@16.2.12>postcss": ${productionDependencyPolicy.overrides.postcss}`,
        `  "next@16.2.12>sharp": ${productionDependencyPolicy.overrides.sharp}`,
      );
    }
    consumerWorkspacePolicy.push('strictPeerDependencies: true', '');
    await writeFile(
      join(destination, 'pnpm-workspace.yaml'),
      consumerWorkspacePolicy.join('\n'),
    );

    run('pnpm', ['--dir', destination, 'install', '--frozen-lockfile=false']);
    if (consumer === 'next-consumer') {
      run('pnpm', [
        '--dir',
        destination,
        'audit',
        '--prod',
        '--audit-level',
        'moderate',
      ]);
      run('pnpm', ['--dir', destination, 'exec', 'node', 'server-render-probe.mjs']);
    }
    run('pnpm', ['--dir', destination, 'build']);
    await verifyPackedBrowser(destination, consumer);
    console.log(
      `${basename(destination)} build and browser behavior verified with the ${supportMatrix} support matrix.`,
    );
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
