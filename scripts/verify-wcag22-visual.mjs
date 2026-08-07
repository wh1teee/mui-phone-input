import assert from 'node:assert/strict';

import react from '@vitejs/plugin-react';
import { chromium, firefox, webkit } from '@playwright/test';
import { createServer } from 'vite';

const browserTypes = { chromium, firefox, webkit };
const requestedBrowser = process.env.WCAG_BROWSER;
if (requestedBrowser && !(requestedBrowser in browserTypes)) {
  throw new Error(`Unsupported WCAG_BROWSER: ${requestedBrowser}`);
}
const browserEntries = requestedBrowser
  ? [[requestedBrowser, browserTypes[requestedBrowser]]]
  : Object.entries(browserTypes);

function browserUrl(baseUrl, parameters = {}) {
  const url = new URL('/tests/visual/wcag22.html', baseUrl);
  for (const [name, value] of Object.entries(parameters)) {
    url.searchParams.set(name, String(value));
  }
  return url.href;
}

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(undefined))),
      ),
  );
}

async function assertNoHorizontalOverflow(page, label) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    offenders: [...document.querySelectorAll('*')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className:
            typeof element.className === 'string'
              ? element.className
              : String(element.tagName),
          left: rect.left,
          right: rect.right,
          tagName: element.tagName,
          width: rect.width,
        };
      })
      .filter(
        (entry) =>
          entry.right > document.documentElement.clientWidth + 1 || entry.left < -1,
      )
      .sort((left, right) => right.width - left.width)
      .slice(0, 8),
    scrollWidth: document.documentElement.scrollWidth,
  }));
  assert.ok(
    geometry.scrollWidth <= geometry.clientWidth + 1,
    `${label} overflowed horizontally: ${JSON.stringify(geometry)}`,
  );
}

async function assertActiveOptionVisible(page, label) {
  const geometry = await page.evaluate(() => {
    const search = document.querySelector('[role="combobox"]');
    const activeId = search?.getAttribute('aria-activedescendant');
    const option = activeId ? document.getElementById(activeId) : null;
    const listbox = document.querySelector('[role="listbox"]');
    if (!(option instanceof HTMLElement) || !(listbox instanceof HTMLElement)) {
      return null;
    }
    const optionRect = option.getBoundingClientRect();
    const listboxRect = listbox.getBoundingClientRect();
    return {
      optionBottom: optionRect.bottom,
      optionTop: optionRect.top,
      listboxBottom: listboxRect.bottom,
      listboxTop: listboxRect.top,
    };
  });
  assert.ok(geometry, `${label} did not expose an active option.`);
  assert.ok(
    geometry.optionTop >= geometry.listboxTop - 1 &&
      geometry.optionBottom <= geometry.listboxBottom + 1,
    `${label} active option is outside the visible listbox: ${JSON.stringify(geometry)}`,
  );
}

async function verifyReflow(page, baseUrl, browserName) {
  for (const scenario of [
    { label: '200% zoom equivalent', width: 640 },
    { label: '400% reflow equivalent', width: 320 },
  ]) {
    await page.setViewportSize({ width: scenario.width, height: 720 });
    await page.goto(browserUrl(baseUrl));
    const trigger = page.getByRole('button', { name: /Select country/u });
    await trigger.click();
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await search.press('End');
    await settle(page);
    await assertNoHorizontalOverflow(page, `${browserName} ${scenario.label}`);
    await assertActiveOptionVisible(page, `${browserName} ${scenario.label}`);
  }

  const sizes = await page.evaluate(() => {
    const triggerElement = document.querySelector('.MuiPhoneInput-countrySelector');
    const searchElement = document.querySelector('[role="combobox"]');
    const optionElement = document.querySelector('[role="option"]');
    return [triggerElement, searchElement, optionElement].map((element) => {
      const rect = element?.getBoundingClientRect();
      return rect ? { height: rect.height, width: rect.width } : null;
    });
  });
  for (const [index, size] of sizes.entries()) {
    assert.ok(size, `${browserName} target ${index} is missing.`);
    assert.ok(
      size.height >= 24 && size.width >= 24,
      `${browserName} target ${index} is smaller than 24 CSS px: ${JSON.stringify(size)}`,
    );
  }
}

async function verifyForcedColors(page, baseUrl, browserName) {
  await page.emulateMedia({ forcedColors: 'active' });
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(browserUrl(baseUrl));
  const trigger = page.getByRole('button', { name: /Select country/u });
  await trigger.focus();
  const triggerFocus = await trigger.evaluate((element) => {
    const style = getComputedStyle(element);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert.notEqual(
    triggerFocus.outlineStyle,
    'none',
    `${browserName} trigger loses its forced-colors focus indicator.`,
  );
  assert.ok(
    Number.parseFloat(triggerFocus.outlineWidth) >= 2,
    `${browserName} trigger forced-colors outline is too thin: ${JSON.stringify(triggerFocus)}`,
  );

  await trigger.press('Enter');
  const search = page.getByRole('combobox', { name: 'Search countries' });
  await search.press('ArrowDown');
  await settle(page);
  const activeOptionOutline = await page.evaluate(() => {
    const searchElement = document.querySelector('[role="combobox"]');
    const activeId = searchElement?.getAttribute('aria-activedescendant');
    const activeOption = activeId ? document.getElementById(activeId) : null;
    if (!(activeOption instanceof HTMLElement)) return null;
    const style = getComputedStyle(activeOption);
    return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth };
  });
  assert.ok(
    activeOptionOutline,
    `${browserName} forced-colors active option is missing.`,
  );
  assert.notEqual(
    activeOptionOutline.outlineStyle,
    'none',
    `${browserName} active option loses its forced-colors focus indicator.`,
  );
  assert.ok(
    Number.parseFloat(activeOptionOutline.outlineWidth) >= 2,
    `${browserName} active option forced-colors outline is too thin: ${JSON.stringify(activeOptionOutline)}`,
  );
}

async function verifyReducedMotion(page, baseUrl, browserName) {
  await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'none' });
  await page.goto(browserUrl(baseUrl, { mode: 'mobile' }));
  await page.getByRole('button', { name: /Select country/u }).click();
  await page.getByRole('dialog', { name: 'Select country' }).waitFor();
  const durations = await page.evaluate(() => {
    const container = document.querySelector('.MuiDialog-container');
    const backdrop = document.querySelector('.MuiBackdrop-root');
    return {
      backdrop: backdrop ? getComputedStyle(backdrop).transitionDuration : null,
      container: container ? getComputedStyle(container).transitionDuration : null,
    };
  });
  assert.equal(
    durations.container,
    '0s',
    `${browserName} reduced-motion Dialog container still transitions: ${JSON.stringify(durations)}`,
  );
  assert.equal(
    durations.backdrop,
    '0s',
    `${browserName} reduced-motion Dialog backdrop still transitions: ${JSON.stringify(durations)}`,
  );
}

const server = await createServer({
  logLevel: 'error',
  plugins: [react()],
  resolve: {
    dedupe: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      'react',
      'react-dom',
    ],
  },
  server: { host: '127.0.0.1', port: 0 },
});

await server.listen();
const address = server.httpServer?.address();
assert.ok(
  address && typeof address === 'object',
  'Vite visual harness did not bind a port.',
);
const baseUrl = `http://127.0.0.1:${address.port}`;
const results = {};

try {
  for (const [browserName, browserType] of browserEntries) {
    const browser = await browserType.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await verifyReflow(page, baseUrl, browserName);
      await verifyForcedColors(page, baseUrl, browserName);
      await verifyReducedMotion(page, baseUrl, browserName);
      results[browserName] = {
        forcedColors: 'pass',
        reducedMotion: 'pass',
        reflow: ['200%', '400%'],
        targetSize: '>=24px',
      };
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}

console.log(`WCAG 2.2 visual matrix: ${JSON.stringify(results)}`);
