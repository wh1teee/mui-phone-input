import axe from 'axe-core';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ComponentProps, ComponentPropsWithRef } from 'react';
import { expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { MuiPhoneInput } from '../../packages/mui-phone-input/src';

function BrokenHtmlInput({
  ownerState: _ownerState,
  ref: _ref,
  ..._props
}: ComponentProps<'input'> & { ownerState?: unknown }) {
  return <input data-testid="broken-html-input" />;
}

function BrokenSearchInput({
  ownerState: _ownerState,
  ref: _ref,
  ..._props
}: ComponentPropsWithRef<'input'> & { ownerState?: unknown }) {
  return <input data-testid="broken-country-search" />;
}

function ForwardingHtmlInput({
  ownerState: _ownerState,
  ...props
}: ComponentProps<'input'> & { ownerState?: unknown }) {
  return <input {...props} data-forwarding-html-input="true" />;
}

function ForwardingSearchInput({
  ownerState: _ownerState,
  ...props
}: ComponentPropsWithRef<'input'> & { ownerState?: unknown }) {
  return <input {...props} data-forwarding-search-input="true" />;
}

const WCAG_22_AA_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
] as const;

async function expectAxeClean(): Promise<void> {
  const results = await axe.run(document.body, {
    runOnly: {
      type: 'tag',
      values: [...WCAG_22_AA_TAGS],
    },
  });
  const violations = results.violations.map((violation) => ({
    id: violation.id,
    targets: violation.nodes.map((node) => node.target),
  }));

  expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
}

async function waitForDialogTransition(): Promise<void> {
  for (let frame = 0; frame < 120; frame += 1) {
    const container = document.querySelector<HTMLElement>('.MuiDialog-container');
    if (container && getComputedStyle(container).opacity === '1') {
      return;
    }
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  throw new Error('The country-selector Dialog did not finish its visual transition.');
}

test('the default phone field has a meaningful accessible name', async () => {
  render(
    <MuiPhoneInput
      disableCountrySelector
      slotProps={{ htmlInput: { 'data-testid': 'default-phone' } }}
    />,
  );

  const input = page.getByTestId('default-phone');
  await expect.element(input).toHaveAccessibleName('Phone number');
  await expectAxeClean();
});

test('associates phone and extension errors without duplicate live announcements', async () => {
  render(
    <MuiPhoneInput
      disableCountrySelector
      extensionError
      extensionHelperText="Extension is required"
      extensionPresentation="inline"
      extensionRequired
      helperText="Phone number is required"
      id="wcag-error-phone"
      required
      validationDisplay="always"
    />,
  );

  const phone = page.getByRole('textbox', { name: 'Phone number' });
  const extension = page.getByRole('textbox', { name: 'Extension' });
  await expect.element(phone).toHaveAttribute('aria-invalid', 'true');
  await expect.element(phone).toHaveAttribute('required');
  await expect.element(extension).toHaveAttribute('aria-invalid', 'true');
  await expect.element(extension).toHaveAttribute('required');

  const phoneErrorId = phone.element().getAttribute('aria-errormessage');
  const extensionErrorId = extension.element().getAttribute('aria-errormessage');
  expect(phoneErrorId).toBeTruthy();
  expect(extensionErrorId).toBeTruthy();
  expect(phoneErrorId).not.toBe(extensionErrorId);
  expect(phone.element().getAttribute('aria-describedby')?.split(/\s+/u)).toContain(
    phoneErrorId,
  );
  expect(extension.element().getAttribute('aria-describedby')?.split(/\s+/u)).toContain(
    extensionErrorId,
  );

  const phoneError = phoneErrorId ? document.getElementById(phoneErrorId) : null;
  const extensionError = extensionErrorId
    ? document.getElementById(extensionErrorId)
    : null;
  expect(phoneError).toHaveTextContent('Phone number is required');
  expect(extensionError).toHaveTextContent('Extension is required');
  expect(phoneError).not.toHaveAttribute('aria-live');
  expect(extensionError).not.toHaveAttribute('aria-live');
  await expectAxeClean();
});

test('diagnoses a custom native-input slot that drops mandatory accessibility props', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    render(
      <MuiPhoneInput
        disableCountrySelector
        required
        slots={{ htmlInput: BrokenHtmlInput }}
        validationDisplay="always"
      />,
    );
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringMatching(/custom htmlInput slot.*forward.*accessibility.*ref/iu),
    );
  } finally {
    consoleError.mockRestore();
  }
});

test('diagnoses a custom selector search slot that drops combobox semantics', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    render(
      <MuiPhoneInput
        defaultCountry="BY"
        label="Diagnostic selector phone"
        slotProps={{
          countrySelector: {
            mode: 'desktop',
            slots: { searchInput: BrokenSearchInput },
          },
        }}
      />,
    );
    await page.getByRole('button', { name: /Select country/u }).click();
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

    expect(consoleError).toHaveBeenCalledWith(
      expect.stringMatching(
        /custom Country Selector searchInput slot.*forward.*role.*aria-controls/iu,
      ),
    );
  } finally {
    consoleError.mockRestore();
  }
});

const rtlTheme = createTheme({ direction: 'rtl' });

test.each([
  {
    name: 'empty',
    renderState: () => <MuiPhoneInput disableCountrySelector />,
  },
  {
    name: 'valid',
    renderState: () => (
      <MuiPhoneInput defaultValue="+375291234567" disableCountrySelector />
    ),
  },
  {
    name: 'invalid',
    renderState: () => (
      <MuiPhoneInput
        defaultValue="+1"
        disableCountrySelector
        validationDisplay="always"
      />
    ),
  },
  {
    name: 'required',
    renderState: () => (
      <MuiPhoneInput disableCountrySelector required validationDisplay="always" />
    ),
  },
  {
    name: 'disabled',
    renderState: () => <MuiPhoneInput disableCountrySelector disabled />,
  },
  {
    name: 'extension',
    renderState: () => (
      <MuiPhoneInput
        defaultExtension="123"
        defaultValue="+12025550123"
        disableCountrySelector
        extensionLabel="Desk extension"
        extensionPresentation="separate"
      />
    ),
  },
  {
    name: 'RTL with logical LTR phone notation',
    renderState: () => (
      <ThemeProvider theme={rtlTheme}>
        <div dir="rtl">
          <MuiPhoneInput defaultCountry="BY" defaultValue="+375291234567" />
        </div>
      </ThemeProvider>
    ),
  },
  {
    name: 'custom native input slot',
    renderState: () => (
      <MuiPhoneInput
        disableCountrySelector
        slots={{ htmlInput: ForwardingHtmlInput }}
      />
    ),
  },
])('is axe-clean for the $name state', async ({ name, renderState }) => {
  render(renderState());
  const phone = page.getByRole('textbox', { name: /Phone number/u });
  await expect.element(phone).toBeInTheDocument();
  if (name === 'RTL with logical LTR phone notation') {
    await expect.element(phone).toHaveAttribute('dir', 'ltr');
  }
  await expectAxeClean();
});

test('keeps the desktop combobox/listbox contract axe-clean while filtered', async () => {
  render(
    <MuiPhoneInput
      defaultCountry="BY"
      label="Selector phone"
      slotProps={{
        countrySelector: {
          mode: 'desktop',
          preferredCountries: ['BY', 'DE', 'PL'],
        },
      }}
    />,
  );

  const trigger = page.getByRole('button', { name: /Select country/u });
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
  await userEvent.click(trigger);
  await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect.element(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  const search = page.getByRole('combobox', { name: 'Search countries' });
  const listbox = page.getByRole('listbox');
  expect(trigger.element().getAttribute('aria-controls')).toBe(listbox.element().id);
  expect(search.element().getAttribute('aria-controls')).toBe(listbox.element().id);
  const initialActiveId = search.element().getAttribute('aria-activedescendant');
  expect(initialActiveId).toBeTruthy();
  expect(
    initialActiveId ? document.getElementById(initialActiveId) : null,
  ).toHaveAttribute('role', 'option');
  await expect
    .element(page.getByRole('option', { name: 'Belarus, BY, +375' }))
    .toHaveAttribute('aria-selected', 'true');
  await expectAxeClean();

  await userEvent.fill(search, 'Germany');
  const germany = page.getByRole('option', { name: 'Germany, DE, +49' });
  await expect.element(germany).toBeInTheDocument();
  await userEvent.keyboard('{Home}{End}');
  const filteredActiveId = search.element().getAttribute('aria-activedescendant');
  expect(filteredActiveId).toBe(germany.element().id);
  await expectAxeClean();

  await userEvent.keyboard('{Escape}');
  await expect.element(listbox).not.toBeInTheDocument();
  await expect.element(trigger).toHaveFocus();
});

test('keeps the mobile Dialog focus loop and background isolation axe-clean', async () => {
  render(
    <div data-testid="mobile-background">
      <button type="button">Background action</button>
      <MuiPhoneInput
        defaultCountry="BY"
        label="Mobile phone"
        slotProps={{ countrySelector: { mode: 'mobile' } }}
      />
    </div>,
  );

  const trigger = page.getByRole('button', { name: /Select country/u });
  await expect.element(trigger).toBeInTheDocument();
  const triggerElement = trigger.element();
  await userEvent.click(trigger);
  const dialog = page.getByRole('dialog', { name: 'Select country' });
  await expect.element(dialog).toBeInTheDocument();
  expect(triggerElement).toHaveAttribute('aria-haspopup', 'dialog');
  expect(triggerElement.getAttribute('aria-controls')).toBe(dialog.element().id);
  const search = dialog.getByRole('combobox', { name: 'Search countries' });
  const close = dialog.getByRole('button', { name: 'Close country selector' });
  await expect.element(search).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  await expect.element(close).toHaveFocus();
  await userEvent.keyboard('{Tab}');
  await expect.element(search).toHaveFocus();
  await waitForDialogTransition();
  await expectAxeClean();
  await userEvent.keyboard('{Escape}');
  await expect.element(dialog).not.toBeInTheDocument();
  expect(document.activeElement).toBe(triggerElement);
});

test.each(['local', 'emoji', 'none', 'external'] as const)(
  'keeps %s flag mode decorative and axe-clean',
  async (flagMode) => {
    render(
      <MuiPhoneInput
        defaultCountry="BY"
        label={`${flagMode} flag phone`}
        slotProps={{
          countrySelector: {
            flagMode,
            mode: 'desktop',
            ...(flagMode === 'external'
              ? {
                  externalFlag: {
                    resolveUrl: (country: string) =>
                      `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><title>${country}</title><rect width="3" height="2" fill="currentColor"/></svg>`)}`,
                  },
                }
              : {}),
          },
        }}
      />,
    );
    await userEvent.click(page.getByRole('button', { name: /Select country/u }));
    const belarus = page.getByRole('option', { name: 'Belarus, BY, +375' });
    await expect.element(belarus).toBeInTheDocument();
    for (const flag of belarus
      .element()
      .querySelectorAll('.MuiPhoneInput-countrySelectorFlag')) {
      expect(flag).toHaveAttribute('aria-hidden', 'true');
    }
    await expectAxeClean();
  },
);

test('keeps fully forwarded custom selector slots semantic and diagnostic-clean', async () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

  try {
    render(
      <MuiPhoneInput
        defaultCountry="BY"
        label="Custom selector slots phone"
        slotProps={{
          countrySelector: {
            mode: 'desktop',
            slots: {
              listbox: 'ol',
              option: 'li',
              searchInput: ForwardingSearchInput,
              trigger: 'button',
            },
          },
        }}
        slots={{ htmlInput: ForwardingHtmlInput }}
      />,
    );
    const trigger = page.getByRole('button', { name: /Select country/u });
    await userEvent.click(trigger);
    await new Promise<void>((resolve) =>
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve())),
    );
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await expect
      .element(search)
      .toHaveAttribute('data-forwarding-search-input', 'true');
    await expect.element(page.getByRole('listbox')).toBeInTheDocument();
    await expect
      .element(page.getByRole('option', { name: 'Belarus, BY, +375' }))
      .toBeInTheDocument();
    const packageDiagnostics = consoleError.mock.calls.filter(([message]) =>
      String(message).includes('[MuiPhoneInput] The custom'),
    );
    expect(packageDiagnostics).toEqual([]);
    await expectAxeClean();
  } finally {
    consoleError.mockRestore();
  }
});
