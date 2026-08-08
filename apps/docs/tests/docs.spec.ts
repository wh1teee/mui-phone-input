import axe from 'axe-core';
import { expect, test } from '@playwright/test';
import ts from 'typescript';

const WCAG_22_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
] as const;

type AxeViolation = {
  id: string;
  targets: unknown[];
};

function expectValidGeneratedTsx(source: string) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2024,
    },
    fileName: 'generated-phone-example.tsx',
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? [])
    .filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
  expect(errors).toEqual([]);
}

test('landing keeps the live input prominent while giving mobile users context first', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');

  const phone = page.getByTestId('landing-phone-input');
  await expect(phone).toBeVisible();
  const bounds = await phone.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.y ?? 801).toBeLessThan(800);
  await phone.focus();
  await phone.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await phone.pressSequentially('+12025550123');
  await expect(page.getByTestId('landing-phone-value')).toHaveText('+12025550123');
  await expect(page.getByRole('link', { name: 'Get started' })).toHaveAttribute(
    'href',
    '#quick-start',
  );
  await expect(page.getByRole('link', { name: 'Open playground' })).toHaveAttribute(
    'href',
    '/playground',
  );
  await expect(
    page.getByRole('link', { name: 'Read phone semantics' }),
  ).toHaveAttribute('href', '#phone-semantics');

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(phone).toBeVisible();
  const [headingBounds, demoBounds] = await Promise.all([
    page.getByRole('heading', { level: 1 }).boundingBox(),
    page.locator('.landing-demo').boundingBox(),
  ]);
  expect(headingBounds).not.toBeNull();
  expect(demoBounds).not.toBeNull();
  expect(headingBounds?.y ?? Number.POSITIVE_INFINITY).toBeLessThan(
    demoBounds?.y ?? Number.NEGATIVE_INFINITY,
  );
  expect(
    await page.evaluate(
      () =>
        document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
});

test('documentation navigation and release disclosure are complete', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'A complete phone input for Material UI',
  );
  await expect(
    page.getByText(/release-candidate channel is live on npm/i),
  ).toBeVisible();
  await expect(page.getByText(/@wh1teee\/mui-phone-input@next/i)).toBeVisible();
  await expect(page.getByText(/mpi-oan\.24/i)).toHaveCount(0);
  await expect(page.getByText(/32,768 bytes gzip/i)).toBeVisible();
  await expect(page.getByText(/virtualization/i).first()).toBeVisible();

  await page.getByRole('link', { name: 'Migration', exact: true }).click();
  await expect(page).toHaveURL(/\/migration$/u);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Replace legacy APIs without preserving legacy authority',
  );

  await page.getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground(?:#|$)/u);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Playground');
});

test('configurator presets keep the live component, inspector, and generated code in parity', async ({
  page,
}) => {
  await page.goto('/playground');

  const generated = page.getByTestId('generated-code');
  const input = page.getByTestId('config-phone-input');
  const display = page.getByTestId('config-display-value');

  await expect(generated).toContainText("defaultCountry='BY'");
  await expect(generated).toContainText('@wh1teee/mui-phone-input/flags.css');
  await expect(generated).not.toContainText('displayMode=');
  await expect(generated).not.toContainText('validationMode=');

  await page.getByTestId('preset-national').click();
  await expect(generated).toContainText("displayMode='national'");
  await expect(generated).toContainText("defaultCountry='US'");
  await expect(page.getByTestId('config-phone-value')).toHaveText('+12025550123');
  expect(await input.inputValue()).toBe(await display.textContent());

  await page.getByTestId('preset-display-mask').click();
  await expect(generated).toContainText(
    "displayMask={{ pattern: '+# (###) ###-####' }}",
  );
  expect(await input.inputValue()).toBe(await display.textContent());

  await page.getByTestId('preset-strict-validation').click();
  await expect(generated).toContainText("validationMode='valid'");
  await expect(page.getByTestId('config-validation-state')).toContainText(
    'valid:valid · accepted',
  );

  await page.getByTestId('preset-inline-extension').click();
  await expect(generated).toContainText("extensionPresentation='inline'");
  await expect(generated).toContainText('type PhoneExtension');

  await page.getByTestId('preset-russian-locale').click();
  await expect(generated).toContainText('@wh1teee/mui-phone-input/locales/ru');
  await page.getByTestId('config-country-selector').click();
  await expect(page.getByRole('combobox', { name: 'Поиск стран' })).toBeVisible();
  await page.keyboard.press('Escape');

  await page.getByTestId('preset-no-flags').click();
  await expect(generated).toContainText("flagMode: 'none'");
  await expect(generated).not.toContainText('@wh1teee/mui-phone-input/flags.css');

  await page.getByTestId('preset-custom-slots').click();
  await expect(generated).toContainText('function CountryOption');
  await expect(generated).toContainText('flagProvider:');
  await page.getByTestId('config-country-selector').click();
  await expect(page.locator('[data-configurator-country]').first()).toBeVisible();
  await page.keyboard.press('Escape');

  expectValidGeneratedTsx(await generated.innerText());
});

test('generated code copy uses the exact current configurator state', async ({
  context,
  page,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/playground');
  await page.getByTestId('preset-fixed-calling-code').click();

  await page.getByLabel('Starting / current Phone Value').fill('+12025550199');
  await expect(page.getByTestId('config-phone-value')).toHaveText('+12025550199');

  const expected = await page.getByTestId('generated-code').innerText();
  expect(expected).toContain("displayMode='international-fixed-calling-code'");
  expect(expected).toContain("useState<PhoneValue>('+12025550199')");
  expect(expected).toContain('selectedCountry={country}');
  expect(expected).toContain(
    'onCountrySelection={(result) => setCountry(result.country)}',
  );
  expect(expected).not.toContain('onCountryChange={setCountry}');
  expectValidGeneratedTsx(expected);

  await page.getByTestId('copy-generated-code').click();
  await expect(page.getByTestId('copy-status')).toContainText(/Code copied/u);
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(expected);
});

test('controlled configurator country ownership follows explicit same-code selection', async ({
  page,
}) => {
  await page.goto('/playground');
  await page.getByTestId('preset-fixed-calling-code').click();
  await expect(page.getByTestId('config-selected-country')).toHaveText('US');

  await page.getByTestId('config-country-selector').click();
  const search = page.getByRole('combobox', { name: 'Search countries' });
  await search.fill('Canada');
  await page.getByRole('option', { name: /Canada, CA, \+1/u }).click();

  await expect(page.getByTestId('config-selected-country')).toHaveText('CA');
  await expect(page.getByTestId('generated-code')).toContainText(
    "useState<MuiPhoneInputProps['selectedCountry']>('CA')",
  );
});

test('configurator deep links restore named presets and current values', async ({
  page,
}) => {
  await page.goto('/playground');
  await page.getByTestId('preset-fixed-calling-code').click();
  await page.getByLabel('Starting / current Phone Value').fill('+12025550177');
  await expect(page.getByTestId('config-phone-value')).toHaveText('+12025550177');
  await expect(page).toHaveURL(/#config=/u);
  const deepLink = page.url();

  await page.goto(deepLink);
  await expect(page.getByTestId('config-phone-value')).toHaveText('+12025550177');
  await expect(page.getByTestId('generated-code')).toContainText(
    "displayMode='international-fixed-calling-code'",
  );
  await expect(page.getByTestId('generated-code')).toContainText('+12025550177');

  await page.goto('/playground#config=mode=not-real&flags=not-real&value=bad%2Bvalue');
  await expect(page.getByTestId('config-phone-input')).toBeVisible();
  await expect(page.getByTestId('config-phone-value')).toHaveText('+375291234567');
});

test('configurator mobile selector, keyboard flow, and responsive layout remain usable', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/playground');

  const bodyFitsViewport = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
  );
  expect(bodyFitsViewport).toBe(true);

  await page.getByTestId('preset-mobile-selector').click();
  const selector = page.getByTestId('config-country-selector');
  await selector.focus();
  await selector.press('Enter');
  const search = page.getByRole('combobox', { name: 'Search countries' });
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill('Poland');
  await expect(page.getByRole('option', { name: /Poland/u })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(selector).toBeFocused();
});

test('Next.js server output survives hydration without a mismatch', async ({
  page,
  request,
}) => {
  const response = await request.get('/playground');
  expect(response.ok()).toBe(true);
  const serverHtml = await response.text();
  expect(serverHtml).toContain('server-evidence');
  expect(serverHtml).toContain('tel:+12025550123;ext=42');
  expect(serverHtml).toContain('&quot;unresolved&quot;:&quot;unresolved&quot;');

  const hydrationErrors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error' && /hydrat/iu.test(message.text())) {
      hydrationErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => hydrationErrors.push(error.message));

  await page.goto('/playground');
  await expect(page.getByTestId('server-evidence')).toContainText(
    'tel:+12025550123;ext=42',
  );
  await expect(page.getByTestId('core-phone-value')).toContainText('+375291234567');
  expect(hydrationErrors).toEqual([]);
});

test('the playground exercises canonical edits and localized country selection', async ({
  page,
}) => {
  await page.goto('/playground');

  const phone = page.getByTestId('core-phone-input');
  await phone.focus();
  await phone.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await phone.pressSequentially('+12025550123');
  await expect(page.getByTestId('core-phone-value')).toContainText('+12025550123');

  await page.getByTestId('localized-country-selector').click();
  const search = page.getByRole('combobox', { name: 'Поиск стран' });
  await search.fill('Польша');
  await page.locator('[data-playground-country="PL"]').click();
  await expect(page.getByTestId('localized-phone-input')).toBeVisible();
});

test('the responsive selector uses a mobile Dialog and preserves RTL input direction', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/playground');

  await expect(page.getByTestId('rtl-phone-input')).toHaveAttribute('dir', 'ltr');
  await page.getByTestId('responsive-country-selector').click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the React Hook Form adapter covers async defaults, dirty/touched, reset, and focus-on-error', async ({
  page,
}) => {
  await page.goto('/playground');

  const phone = page.getByTestId('rhf-phone-input');
  await expect(page.getByTestId('rhf-values')).toContainText('+12025550123');
  await phone.focus();
  await phone.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
  await phone.pressSequentially('+375291234567');
  await phone.press('Tab');
  await expect(page.getByTestId('rhf-form-state')).toContainText('"dirty":true');
  await expect(page.getByTestId('rhf-form-state')).toContainText('phone');

  await page.getByRole('button', { name: 'Reset empty' }).click();
  await expect(page.getByTestId('rhf-values')).toContainText('{}');
  await page.getByRole('button', { name: 'Validate form' }).click();
  await expect(page.getByTestId('rhf-submit-state')).toHaveText('rejected');
  await expect(phone).toBeFocused();

  await page.getByRole('button', { name: 'Reset defaults' }).click();
  await expect(page.getByTestId('rhf-values')).toContainText('+12025550123');
});

test('all rendered internal links resolve and fragment targets exist', async ({
  page,
}) => {
  for (const route of ['/', '/playground', '/migration']) {
    await page.goto(route);
    const links = await page
      .locator('a[href]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute('href')).filter(Boolean),
      );

    for (const href of links) {
      if (!href || /^(?:https?:|mailto:)/u.test(href)) {
        continue;
      }

      const target = new URL(href, page.url());
      const response = await page.request.get(target.pathname);
      expect(response.ok(), `${route} -> ${href}`).toBe(true);

      if (target.hash) {
        await page.goto(`${target.pathname}${target.hash}`);
        await expect(page.locator(target.hash)).toHaveCount(1);
      }
    }
  }
});

test('playground has no WCAG 2.2 A/AA axe violations', async ({ page }) => {
  await page.goto('/playground');
  await expect(page.getByTestId('rhf-values')).toContainText('+12025550123');
  await page.addScriptTag({ content: axe.source });

  const violations = await page.evaluate(async (tags): Promise<AxeViolation[]> => {
    type BrowserAxe = {
      run(
        root: Element,
        options: { runOnly: { type: 'tag'; values: string[] } },
      ): Promise<{
        violations: Array<{ id: string; nodes: Array<{ target: unknown }> }>;
      }>;
    };
    const browserWindow = window as typeof window & { axe: BrowserAxe };
    const results = await browserWindow.axe.run(document.body, {
      runOnly: { type: 'tag', values: [...tags] },
    });
    return results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }));
  }, WCAG_22_AA_TAGS);

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});

test('narrow documentation tables remain keyboard-scrollable and axe-clean', async ({
  page,
}) => {
  await page.setViewportSize({ width: 607, height: 900 });
  await page.goto('/');

  const tableRegion = page.getByRole('region', {
    name: 'Phone country state semantics',
  });
  await expect(tableRegion).toHaveAttribute('tabindex', '0');
  await tableRegion.focus();
  await expect(tableRegion).toBeFocused();

  await page.addScriptTag({ content: axe.source });
  const violations = await page.evaluate(async (): Promise<AxeViolation[]> => {
    type BrowserAxe = {
      run(
        root: Element,
        options: { runOnly: { type: 'rule'; values: string[] } },
      ): Promise<{
        violations: Array<{ id: string; nodes: Array<{ target: unknown }> }>;
      }>;
    };
    const browserWindow = window as typeof window & { axe: BrowserAxe };
    const results = await browserWindow.axe.run(document.body, {
      runOnly: { type: 'rule', values: ['scrollable-region-focusable'] },
    });
    return results.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }));
  });

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
});
