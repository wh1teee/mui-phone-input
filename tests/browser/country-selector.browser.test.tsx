import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axe from 'axe-core';
import { type ComponentPropsWithRef, useEffect, useState } from 'react';
import { describe, expect, test } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  type PhoneCountrySelectorGroupOwnerState,
  type PhoneCountrySelectorIndicatorOwnerState,
  type PhoneCountrySelectorMode,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneCountrySelectorOwnerState,
  type PhoneCountrySelectorSlots,
  PhoneInputCountrySelector,
  type PhoneInputCountrySelectorProps,
  PhoneInputInput,
  PhoneInputProvider,
  usePhoneInput,
  usePhoneInputContext,
} from '../../packages/mui-phone-input/src';

function SemanticTriggerSlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'button'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return (
    <button
      {...props}
      data-owner-disabled={String(ownerState.disabled)}
      data-owner-open={String(ownerState.open)}
    />
  );
}

function SemanticPopupSlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'section'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return <section {...props} data-presentation={ownerState.presentation} />;
}

function PopupSlotWithoutRef({
  ownerState,
  ref: _ref,
  ...props
}: ComponentPropsWithRef<'section'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return <section {...props} data-popup-open={String(ownerState.open)} />;
}

function SemanticGroupSlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorGroupOwnerState;
}) {
  return <li {...props} data-group-label={ownerState.groupLabel} />;
}

function SemanticOptionSlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorOptionOwnerState;
}) {
  return (
    <li
      {...props}
      data-owner-country={ownerState.option.country}
      data-owner-selected={String(ownerState.selected)}
    />
  );
}

function SemanticIndicatorSlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'span'> & {
  ownerState: PhoneCountrySelectorIndicatorOwnerState;
}) {
  return <span {...props} data-indicator-placement={ownerState.placement} />;
}

function SemanticCloseButtonSlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'button'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return <button {...props} data-owner-presentation={ownerState.presentation} />;
}

function SemanticEmptySlot({
  ownerState,
  ...props
}: ComponentPropsWithRef<'div'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return <div {...props} data-empty-query={ownerState.query} />;
}

const semanticSlots = {
  callingCode: SemanticIndicatorSlot,
  closeButton: SemanticCloseButtonSlot,
  countryCode: SemanticIndicatorSlot,
  empty: SemanticEmptySlot,
  group: SemanticGroupSlot,
  groupLabel: 'h3',
  listbox: 'ol',
  option: SemanticOptionSlot,
  optionLabel: 'strong',
  popup: SemanticPopupSlot,
  searchInput: 'input',
  trigger: SemanticTriggerSlot,
} satisfies PhoneCountrySelectorSlots;

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

function NativeTabOrderHarness() {
  const phone = usePhoneInput({ defaultCountry: 'BY' });

  return (
    <PhoneInputProvider value={phone}>
      <div>
        <button data-testid="native-tab-previous-button" type="button">
          Previous button
        </button>
        <div
          contentEditable
          data-testid="native-tab-previous-editable"
          suppressContentEditableWarning
        >
          Previous editable
        </div>
        <PhoneInputCountrySelector
          data-testid="native-tab-trigger"
          disablePortal
          mode="desktop"
        />
        <PhoneInputInput data-testid="native-tab-phone-input" tabIndex={-1} />
        <button data-testid="native-tab-hidden" hidden type="button">
          Hidden button
        </button>
        <button data-testid="native-tab-disabled" disabled type="button">
          Disabled button
        </button>
        <div inert>
          <button data-testid="native-tab-inert" type="button">
            Inert button
          </button>
        </div>
        <span
          data-testid="native-tab-shadow-host"
          ref={(host) => {
            if (host && !host.shadowRoot) {
              const root = host.attachShadow({ mode: 'open' });
              const button = document.createElement('button');
              button.dataset.testid = 'native-tab-shadow-button';
              button.textContent = 'Shadow button';
              button.type = 'button';
              root.append(button);
            }
          }}
        />
        <div
          contentEditable
          data-testid="native-tab-next-editable"
          suppressContentEditableWarning
        >
          Next editable
        </div>
        <details>
          <summary data-testid="native-tab-summary">More controls</summary>
        </details>
        <a data-testid="native-tab-link" href="#native-tab-target">
          Next link
        </a>
        <button data-testid="native-tab-next-button" type="button">
          Next button
        </button>
      </div>
    </PhoneInputProvider>
  );
}

function MediaTabOrderHarness({ kind }: Readonly<{ kind: 'audio' | 'video' }>) {
  const phone = usePhoneInput({ defaultCountry: 'BY' });
  const media =
    kind === 'audio' ? (
      <audio aria-label="Native audio controls" controls data-testid="media-tab-target">
        <track kind="captions" />
      </audio>
    ) : (
      <video aria-label="Native video controls" controls data-testid="media-tab-target">
        <track kind="captions" />
      </video>
    );

  return (
    <PhoneInputProvider value={phone}>
      <div>
        <PhoneInputCountrySelector
          data-testid="media-tab-trigger"
          disablePortal
          mode="desktop"
        />
        {media}
        <button data-testid="media-tab-fallback" type="button">
          Fallback target
        </button>
      </div>
    </PhoneInputProvider>
  );
}

function PositiveTabOrderHarness() {
  const phone = usePhoneInput({ defaultCountry: 'BY' });

  return (
    <PhoneInputProvider value={phone}>
      <div>
        {/* biome-ignore lint/a11y/noPositiveTabindex: regression fixture for explicit browser tab order */}
        <button data-testid="positive-tab-previous" tabIndex={1} type="button">
          Previous positive target
        </button>
        {/* biome-ignore lint/a11y/noPositiveTabindex: regression fixture for explicit browser tab order */}
        <PhoneInputCountrySelector
          data-testid="positive-tab-trigger"
          disablePortal
          mode="desktop"
          tabIndex={2}
        />
        {/* biome-ignore lint/a11y/noPositiveTabindex: regression fixture for explicit browser tab order */}
        <button data-testid="positive-tab-next" tabIndex={3} type="button">
          Next positive target
        </button>
        <button data-testid="positive-tab-regular" type="button">
          Regular target
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

async function waitForOpaqueAncestors(element: Element): Promise<void> {
  for (let frame = 0; frame < 120; frame += 1) {
    let current: Element | null = element;
    let opaque = true;

    while (current) {
      if (Number.parseFloat(getComputedStyle(current).opacity) < 1) {
        opaque = false;
        break;
      }
      current = current.parentElement;
    }

    if (opaque) {
      return;
    }

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  throw new Error('Country selector did not reach a stable opaque state.');
}

async function waitForShadowFocus(host: Element, testId: string): Promise<void> {
  for (let frame = 0; frame < 120; frame += 1) {
    if (host.shadowRoot?.activeElement?.getAttribute('data-testid') === testId) {
      return;
    }

    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
  }

  throw new Error(`Shadow focus did not reach ${testId}.`);
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

  test('preserves native element and shadow-root order when leaving desktop search', async () => {
    const view = await render(<NativeTabOrderHarness />);
    const trigger = page.getByTestId('native-tab-trigger');

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Tab}');
    const shadowHost = page.getByTestId('native-tab-shadow-host').element();
    await waitForShadowFocus(shadowHost, 'native-tab-shadow-button');
    expect(shadowHost.shadowRoot?.activeElement).toHaveAttribute(
      'data-testid',
      'native-tab-shadow-button',
    );
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByTestId('native-tab-next-editable')).toHaveFocus();
    await expect.element(page.getByTestId('native-tab-next-button')).not.toHaveFocus();
    await expect.element(page.getByTestId('native-tab-phone-input')).not.toHaveFocus();
    await expect.element(page.getByTestId('native-tab-hidden')).not.toHaveFocus();
    await expect.element(page.getByTestId('native-tab-disabled')).not.toHaveFocus();
    await expect.element(page.getByTestId('native-tab-inert')).not.toHaveFocus();
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByTestId('native-tab-summary')).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByTestId('native-tab-link')).toHaveFocus();

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect
      .element(page.getByTestId('native-tab-previous-editable'))
      .toHaveFocus();
    await expect
      .element(page.getByTestId('native-tab-previous-button'))
      .not.toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(page.getByTestId('native-tab-previous-button')).toHaveFocus();
    await view.unmount();
  });

  test.each(['audio', 'video'] as const)(
    'preserves native %s controls as the next desktop target',
    async (kind) => {
      const view = await render(<MediaTabOrderHarness kind={kind} />);

      await userEvent.click(page.getByTestId('media-tab-trigger'));
      await expect
        .element(page.getByRole('combobox', { name: 'Search countries' }))
        .toHaveFocus();
      await userEvent.keyboard('{Tab}');
      await expect.element(page.getByTestId('media-tab-target')).toHaveFocus();
      await expect.element(page.getByTestId('media-tab-fallback')).not.toHaveFocus();
      await view.unmount();
    },
  );

  test('preserves explicit positive tabindex order around the desktop trigger', async () => {
    const view = await render(<PositiveTabOrderHarness />);
    const trigger = page.getByTestId('positive-tab-trigger');

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByTestId('positive-tab-next')).toHaveFocus();
    await expect.element(page.getByTestId('positive-tab-regular')).not.toHaveFocus();

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(page.getByTestId('positive-tab-previous')).toHaveFocus();
    await view.unmount();
  });

  test('preserves native Tab order from a portaled desktop selector', async () => {
    const view = await render(<KeyboardExitHarness mode="desktop" />);
    const trigger = page.getByTestId('desktop-keyboard-trigger');

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Tab}');
    await expect.element(page.getByTestId('desktop-next')).toHaveFocus();

    await userEvent.click(trigger);
    await expect
      .element(page.getByRole('combobox', { name: 'Search countries' }))
      .toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    await expect.element(page.getByTestId('desktop-previous')).toHaveFocus();
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
      await waitForOpaqueAncestors(
        page.getByRole('combobox', { name: 'Search countries' }).element(),
      );

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

  test('exposes semantic selector sub-slots without losing prepared behavior', async () => {
    let triggerElement: HTMLButtonElement | null = null;
    let searchElement: HTMLInputElement | null = null;
    let optionClicks = 0;

    render(
      <MuiPhoneInput
        defaultCountry="CA"
        label="Semantic selector phone"
        slotProps={{
          countrySelector: {
            mode: 'desktop',
            slotProps: {
              callingCode: { 'data-testid': 'semantic-calling-code' },
              countryCode: { 'data-testid': 'semantic-country-code' },
              empty: { 'data-testid': 'semantic-empty' },
              group: (ownerState) => ({
                'data-testid': `semantic-group-${ownerState.preferred ? 'preferred' : 'all'}`,
              }),
              groupLabel: { 'data-testid': 'semantic-group-label' },
              listbox: {
                'aria-labelledby': 'consumer-listbox-label',
                'aria-label': 'Consumer listbox override',
                'data-testid': 'semantic-listbox',
                id: 'consumer-listbox-id',
                role: 'presentation',
              },
              option: (ownerState) => ({
                'aria-label': 'Consumer option override',
                'aria-selected': true,
                'data-option-index': 999,
                'data-testid': `semantic-option-${ownerState.option.country}`,
                id: 'consumer-option-id',
                onClick: () => {
                  optionClicks += 1;
                },
                role: 'button',
              }),
              optionLabel: { 'data-testid': 'semantic-option-label' },
              popup: { 'data-testid': 'semantic-popup' },
              searchInput: {
                'aria-label': 'Consumer search override',
                'data-country-selector-presentation': 'mobile',
                'data-testid': 'semantic-search',
                id: 'consumer-search-id',
                ref: (input) => {
                  searchElement = input;
                },
                role: 'button',
              },
              trigger: (ownerState) => ({
                'aria-expanded': false,
                'data-testid': 'semantic-trigger',
                'data-validation-status': ownerState.validationStatus,
                ref: (button) => {
                  triggerElement = button;
                },
              }),
            },
            slots: semanticSlots,
          },
          htmlInput: { 'data-testid': 'semantic-phone-input' },
        }}
      />,
    );

    const trigger = page.getByTestId('semantic-trigger');
    await expect.element(trigger).toBeInTheDocument();
    expect(triggerElement).toBe(trigger.element());
    await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect.element(trigger).toHaveAttribute('data-owner-open', 'false');
    await userEvent.click(trigger);

    await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect.element(trigger).toHaveAttribute('data-owner-open', 'true');
    await expect
      .element(page.getByTestId('semantic-popup'))
      .toHaveAttribute('data-presentation', 'desktop');
    const search = page.getByRole('combobox', { name: 'Search countries' });
    expect(searchElement).toBe(search.element());
    await expect.element(search).toHaveAttribute('data-testid', 'semantic-search');
    await expect
      .element(search)
      .toHaveAttribute('data-country-selector-presentation', 'desktop');
    const listbox = page.getByRole('listbox');
    await expect.element(listbox).toHaveAttribute('data-testid', 'semantic-listbox');
    expect(listbox.element().id).not.toBe('consumer-listbox-id');
    expect(trigger.element().getAttribute('aria-controls')).toBe(listbox.element().id);

    await userEvent.fill(search, 'Belarus');
    const belarusOption = page.getByRole('option', {
      name: 'Belarus, BY, +375',
    });
    await expect.element(belarusOption).toHaveAttribute('data-owner-country', 'BY');
    await expect.element(belarusOption).toHaveAttribute('data-owner-selected', 'false');
    await expect.element(belarusOption).toHaveAttribute('aria-selected', 'false');
    expect(belarusOption.element().id).not.toBe('consumer-option-id');
    expect(belarusOption.element().getAttribute('data-option-index')).not.toBe('999');
    await expect
      .element(belarusOption.getByTestId('semantic-option-label'))
      .toHaveTextContent('Belarus');
    await expect
      .element(belarusOption.getByTestId('semantic-country-code'))
      .toHaveAttribute('data-indicator-placement', 'option');
    await expect
      .element(belarusOption.getByTestId('semantic-calling-code'))
      .toHaveAttribute('data-indicator-placement', 'option');
    await userEvent.click(belarusOption);
    expect(optionClicks).toBe(1);
    await expect.element(page.getByTestId('semantic-phone-input')).toHaveValue('+375');

    await userEvent.click(trigger);
    await userEvent.fill(
      page.getByRole('combobox', { name: 'Search countries' }),
      'zzz',
    );
    await expect
      .element(page.getByTestId('semantic-empty'))
      .toHaveTextContent('No matching countries');
    await expect
      .element(page.getByTestId('semantic-empty'))
      .toHaveAttribute('data-empty-query', 'zzz');
  });

  test('composes a custom mobile close-button slot with Dialog focus behavior', async () => {
    let closeButtonElement: HTMLButtonElement | null = null;
    let closeClicks = 0;
    let preventedCloseTabs = 0;

    render(
      <MuiPhoneInput
        defaultCountry="BY"
        label="Mobile semantic selector phone"
        slotProps={{
          countrySelector: {
            'data-testid': 'mobile-semantic-trigger',
            mode: 'mobile',
            slotProps: {
              closeButton: {
                'aria-label': 'Consumer close override',
                'data-testid': 'mobile-semantic-close',
                onClick: () => {
                  closeClicks += 1;
                },
                onKeyDown: (event) => {
                  if (event.key === 'Tab') {
                    preventedCloseTabs += 1;
                    event.preventDefault();
                  }
                },
                ref: (button) => {
                  closeButtonElement = button;
                },
              },
            },
            slots: { closeButton: semanticSlots.closeButton },
          },
        }}
      />,
    );

    const trigger = page.getByTestId('mobile-semantic-trigger');
    await userEvent.click(trigger);
    const dialog = page.getByRole('dialog', { name: 'Select country' });
    await expect.element(dialog).toBeInTheDocument();
    const closeButton = page.getByRole('button', { name: 'Close country selector' });
    await expect
      .element(closeButton)
      .toHaveClass('MuiPhoneInput-countrySelectorCloseButton');
    await expect
      .element(closeButton)
      .toHaveAttribute('data-owner-presentation', 'mobile');
    expect(closeButtonElement).toBe(closeButton.element());
    closeButton.element().focus();
    await userEvent.keyboard('{Tab}');
    expect(preventedCloseTabs).toBe(1);
    await expect.element(closeButton).toHaveFocus();
    await userEvent.click(closeButton);
    expect(closeClicks).toBe(1);
    await expect.element(dialog).not.toBeInTheDocument();
    await expect.element(trigger).toHaveFocus();
  });

  test('preserves selector and trigger-slot disabled props', async () => {
    render(
      <>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Disabled selector component"
          slotProps={{
            countrySelector: {
              'data-testid': 'component-disabled-selector',
              disabled: true,
              mode: 'desktop',
              slots: { trigger: SemanticTriggerSlot },
            },
          }}
        />
        <MuiPhoneInput
          defaultCountry="BY"
          label="Disabled selector trigger slot"
          slotProps={{
            countrySelector: {
              'data-testid': 'slot-disabled-selector',
              mode: 'desktop',
              slotProps: { trigger: { disabled: true } },
            },
          }}
        />
      </>,
    );

    const componentDisabledTrigger = page.getByTestId('component-disabled-selector');
    const slotDisabledTrigger = page.getByTestId('slot-disabled-selector');
    await expect.element(componentDisabledTrigger).toBeDisabled();
    await expect
      .element(componentDisabledTrigger)
      .toHaveAttribute('data-owner-disabled', 'true');
    await expect.element(slotDisabledTrigger).toBeDisabled();
    for (const trigger of [componentDisabledTrigger, slotDisabledTrigger]) {
      const element = trigger.element();
      expect(element).toBeInstanceOf(HTMLButtonElement);
      if (!(element instanceof HTMLButtonElement)) {
        throw new TypeError('Expected a disabled selector button.');
      }
      element.click();
    }
    await expect
      .element(componentDisabledTrigger)
      .toHaveAttribute('aria-expanded', 'false');
    await expect.element(slotDisabledTrigger).toHaveAttribute('aria-expanded', 'false');
    expect(page.getByRole('listbox').query()).toBeNull();
  });

  test('keeps click-away dismissal when a plain popup slot ignores its ref', async () => {
    render(
      <div>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Plain popup selector phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'plain-popup-trigger',
              disablePortal: true,
              mode: 'desktop',
              slotProps: {
                popup: { 'data-testid': 'plain-popup' },
              },
              slots: { popup: PopupSlotWithoutRef },
            },
          }}
        />
      </div>,
    );

    await userEvent.click(page.getByTestId('plain-popup-trigger'));
    const popup = page.getByTestId('plain-popup');
    await expect.element(popup).toHaveAttribute('data-popup-open', 'true');
    document.body.dispatchEvent(
      new MouseEvent('click', { bubbles: true, composed: true }),
    );
    await expect.element(popup).not.toBeInTheDocument();
  });

  test('applies MUI style overrides to default semantic selector slots', async () => {
    const theme = createTheme({
      components: {
        MuiPhoneInput: {
          styleOverrides: {
            countrySelectorCallingCode: {
              fontWeight: 700,
            },
            countrySelectorOptionLabel: {
              letterSpacing: '3px',
            },
          },
        },
      },
    });

    render(
      <ThemeProvider theme={theme}>
        <MuiPhoneInput
          defaultCountry="CA"
          label="Themed semantic selector phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'themed-semantic-trigger',
              mode: 'desktop',
            },
          }}
        />
      </ThemeProvider>,
    );

    await userEvent.click(page.getByTestId('themed-semantic-trigger'));
    await userEvent.fill(
      page.getByRole('combobox', { name: 'Search countries' }),
      'BY',
    );
    const option = page.getByRole('option', { name: 'Belarus, BY, +375' });
    await expect.element(option).toBeInTheDocument();
    const optionLabelElement = option
      .element()
      .querySelector<HTMLElement>('.MuiPhoneInput-countrySelectorOptionLabel');
    const callingCodeElement = option
      .element()
      .querySelector<HTMLElement>('.MuiPhoneInput-countrySelectorCallingCode');
    expect(optionLabelElement).toBeInstanceOf(HTMLElement);
    expect(callingCodeElement).toBeInstanceOf(HTMLElement);
    if (!(optionLabelElement && callingCodeElement)) {
      throw new TypeError('Themed semantic selector slots are missing.');
    }
    expect(getComputedStyle(optionLabelElement).letterSpacing).toBe('3px');
    expect(getComputedStyle(callingCodeElement).fontWeight).toBe('700');
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
