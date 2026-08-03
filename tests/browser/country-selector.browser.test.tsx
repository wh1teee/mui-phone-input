import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import axe from 'axe-core';
import { useEffect, useState } from 'react';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  type PhoneCountrySelectorMode,
  PhoneInputCountrySelector,
  type PhoneInputCountrySelectorProps,
  PhoneInputProvider,
  usePhoneInput,
  usePhoneInputContext,
} from '../../packages/mui-phone-input/src';

const localizedName = (country: string, locale: string): string | undefined => {
  if (locale === 'be' && country === 'BY') {
    return 'Беларусь';
  }
  return undefined;
};

function DesktopSelectorHarness() {
  const [details, setDetails] = useState('');

  return (
    <>
      <MuiPhoneInput
        classes={{ countrySelectorOption: 'consumer-country-option' }}
        defaultCountry="CA"
        label="Desktop phone"
        onChange={(_value, nextDetails) => setDetails(JSON.stringify(nextDetails))}
        slotProps={{
          countrySelector: {
            'data-testid': 'desktop-trigger',
            classes: { countrySelectorSearchInput: 'consumer-country-search' },
            locale: 'be',
            mode: 'desktop',
            preferredCountries: ['BY', 'PL', 'LT', 'BY'],
            resolveCountryName: localizedName,
            resultLimit: 50,
          },
        }}
      />
      <output data-testid="desktop-details">{details}</output>
    </>
  );
}

function ResponsiveSelectorHarness() {
  const [mode, setMode] = useState<PhoneCountrySelectorMode>('desktop');

  useEffect(() => {
    const switchMode = () =>
      setMode((current) => (current === 'desktop' ? 'mobile' : 'desktop'));
    window.addEventListener('switch-country-selector-mode', switchMode);
    return () => window.removeEventListener('switch-country-selector-mode', switchMode);
  }, []);

  return (
    <MuiPhoneInput
      defaultCountry="CA"
      label="Responsive phone"
      slotProps={{
        countrySelector: {
          'data-testid': 'responsive-trigger',
          locale: 'be',
          mode,
          resolveCountryName: localizedName,
        },
      }}
    />
  );
}

function KeyboardExitHarness({
  disablePortal = false,
  mode,
  resultLimit,
}: Readonly<{
  disablePortal?: boolean;
  mode: Exclude<PhoneCountrySelectorMode, 'auto'>;
  resultLimit?: number;
}>) {
  const phone = usePhoneInput({ defaultCountry: 'BY' });
  const resultLimitProps: Pick<PhoneInputCountrySelectorProps, 'resultLimit'> =
    resultLimit === undefined ? {} : { resultLimit };

  return (
    <PhoneInputProvider value={phone}>
      <div data-testid={`${mode}-keyboard-harness`}>
        <button data-testid={`${mode}-previous`} type="button">
          Previous control
        </button>
        <PhoneInputCountrySelector
          data-testid={`${mode}-keyboard-trigger`}
          disablePortal={disablePortal}
          mode={mode}
          {...resultLimitProps}
        />
        <button data-testid={`${mode}-next`} type="button">
          Next control
        </button>
      </div>
    </PhoneInputProvider>
  );
}

function DesktopKeyboardBoundaryHarness() {
  const phone = usePhoneInput({ defaultCountry: 'BY' });
  const [defaultPrevented, setDefaultPrevented] = useState<boolean | null>(null);

  return (
    <PhoneInputProvider value={phone}>
      <fieldset
        onKeyDown={(event) => {
          if (event.key === 'Tab') {
            setDefaultPrevented(event.defaultPrevented);
          }
        }}
      >
        <legend>Desktop keyboard boundary</legend>
        <PhoneInputCountrySelector
          data-testid="desktop-boundary-trigger"
          disablePortal
          mode="desktop"
        />
        <output data-testid="desktop-boundary-default-prevented">
          {defaultPrevented === null ? 'unset' : String(defaultPrevented)}
        </output>
      </fieldset>
    </PhoneInputProvider>
  );
}

function summarizeAxeViolations(
  violations: axe.Result[],
): ReadonlyArray<Readonly<{ help: string; id: string; targets: string[] }>> {
  return violations.map((violation) => ({
    help: violation.help,
    id: violation.id,
    targets: violation.nodes.map((node) => JSON.stringify(node.target)),
  }));
}

function CustomCountrySelector({
  classes: _classes,
  className,
  ...props
}: PhoneInputCountrySelectorProps) {
  const phone = usePhoneInputContext();

  return (
    <button
      className={className}
      data-testid={props['data-testid']}
      onClick={() => phone.actions.selectCountry('BY')}
      type="button"
    >
      Custom country
    </button>
  );
}

function PagePortalPolicyHarness() {
  const [portalContainer, setPortalContainer] = useState<HTMLDivElement | null>(null);

  return (
    <>
      <div data-testid="page-host">
        <MuiPhoneInput
          defaultCountry="CA"
          label="Page phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'page-trigger',
              mode: 'desktop',
            },
          }}
        />
      </div>

      <div data-testid="portal-target" ref={setPortalContainer} />
      <div data-testid="container-host">
        <MuiPhoneInput
          defaultCountry="CA"
          label="Container phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'container-trigger',
              mode: 'desktop',
              portalContainer,
            },
          }}
        />
      </div>
    </>
  );
}

function EmbeddedPortalPolicyHarness({
  context,
}: Readonly<{ context: 'bottom-sheet' | 'dialog' | 'drawer' }>) {
  const content = (
    <div data-testid={`${context}-host`}>
      <MuiPhoneInput
        defaultCountry="CA"
        label={`${context} phone`}
        slotProps={{
          countrySelector: {
            'data-testid': `${context}-trigger`,
            disablePortal: true,
            mode: 'desktop',
          },
        }}
      />
    </div>
  );

  if (context === 'dialog') {
    return (
      <Dialog open>
        <DialogContent>{content}</DialogContent>
      </Dialog>
    );
  }

  if (context === 'drawer') {
    return (
      <Drawer open variant="permanent">
        {content}
      </Drawer>
    );
  }

  return (
    <div data-testid="bottom-sheet" role="dialog">
      {content}
    </div>
  );
}

describe('responsive country selector', () => {
  test('lets forward and reverse Tab leave the desktop selector', async () => {
    const view = await render(<KeyboardExitHarness disablePortal mode="desktop" />);
    const trigger = page.getByTestId('desktop-keyboard-trigger');

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    expect(
      Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).every(
        (option) => option.tabIndex === -1,
      ),
    ).toBe(true);
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByTestId('desktop-next')).toHaveFocus();
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .not.toBeInTheDocument();

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(page.getByTestId('desktop-previous')).toHaveFocus();
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .not.toBeInTheDocument();
    await view.unmount();
  });

  test('keeps forward and reverse Tab inside the mobile Dialog', async () => {
    const view = await render(<KeyboardExitHarness mode="mobile" />);
    const trigger = page.getByTestId('mobile-keyboard-trigger');

    await userEvent.click(trigger);
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await expect.element(search).toHaveFocus();
    const close = page.getByRole('button', { name: 'Close country selector' });
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(close).toHaveFocus();
    await expect
      .element(page.getByRole('dialog', { name: 'Select country' }))
      .toBeInTheDocument();

    await userEvent.keyboard('{Tab}');
    await expect.element(search).toHaveFocus();
    await expect
      .element(page.getByRole('dialog', { name: 'Select country' }))
      .toBeInTheDocument();
    await view.unmount();
  });

  test('does not suppress desktop Tab when no following focus target exists', async () => {
    const view = await render(<DesktopKeyboardBoundaryHarness />);

    await userEvent.click(page.getByTestId('desktop-boundary-trigger'));
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Tab}');

    await expect
      .element(page.getByTestId('desktop-boundary-default-prevented'))
      .toHaveTextContent('false');
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .not.toBeInTheDocument();
    await view.unmount();
  });

  test.each(['desktop', 'mobile'] as const)(
    'restores the %s trigger on Escape',
    async (mode) => {
      const view = await render(<KeyboardExitHarness mode={mode} />);
      const trigger = page.getByTestId(`${mode}-keyboard-trigger`);

      await userEvent.click(trigger);
      await userEvent.keyboard('{Escape}');

      await expect.element(trigger).toHaveFocus();
      await expect
        .element(page.getByRole('combobox', { name: 'Search countries' }))
        .not.toBeInTheDocument();
      await view.unmount();
    },
  );

  test('restores the mobile trigger from the explicit close button', async () => {
    const view = await render(<KeyboardExitHarness mode="mobile" />);
    const trigger = page.getByTestId('mobile-keyboard-trigger');

    await userEvent.click(trigger);
    await userEvent.click(page.getByRole('button', { name: 'Close country selector' }));

    await expect.element(trigger).toHaveFocus();
    await expect
      .element(page.getByRole('dialog', { name: 'Select country' }))
      .not.toBeInTheDocument();
    await view.unmount();
  });

  test.each(['desktop', 'mobile'] as const)(
    'has no automated WCAG 2.2 A/AA violations in the open %s selector',
    async (mode) => {
      const view = await render(<KeyboardExitHarness mode={mode} resultLimit={5} />);

      await userEvent.click(page.getByTestId(`${mode}-keyboard-trigger`));
      await expect
        .element(page.getByRole('combobox', { name: 'Search countries' }))
        .toHaveFocus();

      const results = await axe.run(document.body, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
        },
      });

      const violations = summarizeAxeViolations(results.violations);
      expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      await view.unmount();
    },
  );

  test('searches localized names, orders preferred countries once, and commits by keyboard', async () => {
    render(<DesktopSelectorHarness />);
    const trigger = page.getByTestId('desktop-trigger');
    const phoneInput = page.getByRole('textbox', { name: 'Desktop phone' });

    await userEvent.click(trigger);
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await expect.element(search).toHaveFocus();
    await expect.element(search).toHaveClass('consumer-country-search');
    const searchControls = search.element().getAttribute('aria-controls');
    const controlledListbox = searchControls
      ? document.getElementById(searchControls)
      : null;
    expect(controlledListbox).toHaveAttribute('role', 'listbox');
    expect(trigger.element().getAttribute('aria-controls')).toBe(searchControls);
    const searchInput = search.element();
    if (!(searchInput instanceof HTMLInputElement)) {
      throw new TypeError('Expected the country selector search input.');
    }

    const initialCountries = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"]'),
      (option) => option.dataset.country,
    );
    expect(initialCountries.slice(0, 3)).toEqual(['BY', 'PL', 'LT']);
    expect(initialCountries.filter((country) => country === 'BY')).toHaveLength(1);

    await userEvent.type(search, 'BY');
    await expect
      .element(
        page.getByRole('option', {
          exact: true,
          name: 'Беларусь, BY, +375',
        }),
      )
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('option', { name: /Беларусь/u }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole('option', { name: /Беларусь/u }))
      .toHaveClass('consumer-country-option');
    searchInput.select();
    await userEvent.type(search, '+375');
    await expect
      .element(page.getByRole('option', { name: /Беларусь/u }))
      .toBeInTheDocument();
    searchInput.select();
    await userEvent.type(search, 'бел');
    const belarus = page.getByRole('option', { name: /Беларусь/u });
    await expect.element(belarus).toBeInTheDocument();
    await expect
      .element(search)
      .toHaveAttribute('aria-activedescendant', belarus.element().id);
    await userEvent.keyboard('{Enter}');

    await expect.element(phoneInput).toHaveValue('+375');
    await expect.element(trigger).toHaveFocus();
    expect(
      JSON.parse(page.getByTestId('desktop-details').element().textContent ?? ''),
    ).toMatchObject({
      reason: 'country-selection',
      value: '+375',
    });
  });

  test('announces an English country option exactly once', async () => {
    const view = await render(<KeyboardExitHarness mode="desktop" />);

    await userEvent.click(page.getByTestId('desktop-keyboard-trigger'));
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await userEvent.type(search, 'BY');

    await expect
      .element(
        page.getByRole('option', {
          exact: true,
          name: 'Belarus, BY, +375',
        }),
      )
      .toBeInTheDocument();
    await view.unmount();
  });

  test('keeps the highlighted option visible in the bounded standard list', async () => {
    render(<DesktopSelectorHarness />);
    await userEvent.click(page.getByTestId('desktop-trigger'));
    const search = page.getByRole('combobox', { name: 'Search countries' });
    await userEvent.keyboard('{End}');

    const activeId = search.element().getAttribute('aria-activedescendant');
    const activeOption = activeId ? document.getElementById(activeId) : null;
    const listbox = document.querySelector<HTMLElement>('[role="listbox"]');
    expect(activeOption).toBeInstanceOf(HTMLElement);
    expect(listbox).toBeInstanceOf(HTMLElement);
    if (!(activeOption instanceof HTMLElement) || !(listbox instanceof HTMLElement)) {
      throw new TypeError('Country selector active option or listbox is missing.');
    }
    const optionTop = activeOption.offsetTop;
    const optionBottom = optionTop + activeOption.offsetHeight;
    expect(optionTop).toBeGreaterThanOrEqual(listbox.scrollTop);
    expect(optionBottom).toBeLessThanOrEqual(
      listbox.scrollTop + listbox.clientHeight + 1,
    );
  });

  test('preserves the search draft while changing from Popper to mobile Dialog', async () => {
    render(<ResponsiveSelectorHarness />);
    const trigger = page.getByTestId('responsive-trigger');

    await userEvent.click(trigger);
    const desktopSearch = page.getByRole('combobox', { name: 'Search countries' });
    await userEvent.type(desktopSearch, 'бел');
    window.dispatchEvent(new Event('switch-country-selector-mode'));

    const dialog = page.getByRole('dialog', { name: 'Select country' });
    await expect.element(dialog).toBeInTheDocument();
    expect(trigger.element().getAttribute('aria-controls')).toBe(dialog.element().id);
    const mobileSearch = dialog.getByRole('combobox', { name: 'Search countries' });
    await expect.element(mobileSearch).toHaveValue('бел');
    await userEvent.keyboard('{Enter}');
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  test('supports a custom country-selector slot on the shared controller', async () => {
    render(
      <MuiPhoneInput
        defaultCountry="CA"
        label="Custom selector phone"
        slots={{ countrySelector: CustomCountrySelector }}
        slotProps={{
          countrySelector: { 'data-testid': 'custom-country-trigger' },
          htmlInput: { 'data-testid': 'custom-country-input' },
        }}
      />,
    );

    const trigger = page.getByTestId('custom-country-trigger');
    await expect.element(trigger).toHaveClass('MuiPhoneInput-countrySelector');
    await userEvent.click(trigger);
    await expect.element(page.getByTestId('custom-country-input')).toHaveValue('+375');
  });

  test('honors page, explicit container, Dialog, Drawer, and BottomSheet portal policies', async () => {
    const pageView = await render(<PagePortalPolicyHarness />);

    await userEvent.click(page.getByTestId('page-trigger'));
    const pagePopup = document.querySelector<HTMLElement>(
      '.MuiPhoneInput-countrySelectorPopup',
    );
    expect(pagePopup?.parentElement).not.toBeNull();
    expect(page.getByTestId('page-host').element().contains(pagePopup)).toBe(false);
    await userEvent.keyboard('{Escape}');

    await userEvent.click(page.getByTestId('container-trigger'));
    expect(
      page
        .getByTestId('portal-target')
        .element()
        .querySelector('.MuiPhoneInput-countrySelectorPopup'),
    ).toBeInstanceOf(HTMLElement);
    await userEvent.keyboard('{Escape}');
    await pageView.unmount();

    for (const context of ['dialog', 'drawer', 'bottom-sheet'] as const) {
      const view = await render(<EmbeddedPortalPolicyHarness context={context} />);
      await userEvent.click(page.getByTestId(`${context}-trigger`));
      expect(
        page
          .getByTestId(`${context}-host`)
          .element()
          .querySelector('.MuiPhoneInput-countrySelectorPopup'),
      ).toBeInstanceOf(HTMLElement);
      await userEvent.keyboard('{Escape}');
      await view.unmount();
    }
  });
});
