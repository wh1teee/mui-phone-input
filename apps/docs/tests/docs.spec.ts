import axe from 'axe-core';
import { expect, test } from '@playwright/test';

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

test('documentation navigation and release disclosure are complete', async ({
  page,
}) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toContainText(
    'Phone input semantics first',
  );
  await expect(page.getByText('mpi-oan.24').first()).toBeVisible();
  await expect(page.getByText(/release candidate cannot publish/i)).toBeVisible();
  await expect(page.getByText(/32,768 bytes gzip/i)).toBeVisible();
  await expect(page.getByText(/virtualization/i).first()).toBeVisible();

  await page.getByRole('link', { name: 'Migration', exact: true }).click();
  await expect(page).toHaveURL(/\/migration$/u);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Replace legacy APIs without preserving legacy authority',
  );

  await page.getByRole('link', { name: 'Playground', exact: true }).click();
  await expect(page).toHaveURL(/\/playground$/u);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Playground');
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
