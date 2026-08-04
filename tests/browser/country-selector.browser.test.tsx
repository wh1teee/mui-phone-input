import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Drawer from '@mui/material/Drawer';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import axe from 'axe-core';
import { type ComponentPropsWithRef, useEffect, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
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
  type PhoneValue,
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

function ImeSearchInputSlot({
  ownerState: _ownerState,
  ...props
}: ComponentPropsWithRef<'input'> & {
  ownerState: PhoneCountrySelectorOwnerState;
}) {
  return <input {...props} data-custom-search-input="true" />;
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

function LocalizedDigitSearchHarness() {
  return (
    <MuiPhoneInput
      defaultCountry="US"
      label="Localized digit search phone"
      slotProps={{
        countrySelector: {
          'data-testid': 'localized-digit-trigger',
          countryFilter: (country) => ['BY', 'DE', 'KZ', 'US'].includes(country),
          locale: 'be',
          mode: 'desktop',
          resolveCountryName: localizedName,
          slotProps: {
            searchInput: {
              'data-testid': 'localized-digit-search',
              dir: 'rtl',
            },
          },
        },
      }}
    />
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

type FilteredActiveCountrySource = 'controlled' | 'default' | 'resolved';

function FilteredActiveCountryHarness({
  disablePortal = false,
  initialExcluded = true,
  mode = 'desktop',
  source = 'default',
}: Readonly<{
  disablePortal?: boolean;
  initialExcluded?: boolean;
  mode?: Exclude<PhoneCountrySelectorMode, 'auto'>;
  source?: FilteredActiveCountrySource;
}>) {
  const [excludeActive, setExcludeActive] = useState(initialExcluded);
  const [value, setValue] = useState<PhoneValue>(
    source === 'resolved' ? '+375291234567' : undefined,
  );
  const [changeCount, setChangeCount] = useState(0);
  const [countryChangeCount, setCountryChangeCount] = useState(0);
  const [countrySelectionCount, setCountrySelectionCount] = useState(0);
  const ownershipProps =
    source === 'default'
      ? ({ defaultCountry: 'BY' } as const)
      : source === 'controlled'
        ? ({ selectedCountry: 'BY' } as const)
        : ({ value } as const);

  return (
    <>
      <MuiPhoneInput
        {...ownershipProps}
        label={`Filtered ${source} country phone`}
        onChange={(nextValue) => {
          if (source === 'resolved') {
            setValue(nextValue);
          }
          setChangeCount((count) => count + 1);
        }}
        onCountryChange={() => setCountryChangeCount((count) => count + 1)}
        onCountrySelection={() => setCountrySelectionCount((count) => count + 1)}
        slotProps={{
          countrySelector: {
            'data-testid': `filtered-${source}-${mode}-trigger`,
            countryFilter: (country) => !(excludeActive && country === 'BY'),
            disablePortal,
            locale: 'be',
            mode,
            resolveCountryName: localizedName,
          },
          htmlInput: { 'data-testid': `filtered-${source}-${mode}-input` },
        }}
      />
      <button onClick={() => setExcludeActive(true)} type="button">
        Exclude active country
      </button>
      <button onClick={() => setExcludeActive(false)} type="button">
        Include active country
      </button>
      <output data-testid={`filtered-${source}-change-count`}>{changeCount}</output>
      <output data-testid={`filtered-${source}-country-change-count`}>
        {countryChangeCount}
      </output>
      <output data-testid={`filtered-${source}-country-selection-count`}>
        {countrySelectionCount}
      </output>
    </>
  );
}

function ImeCountrySelectorHarness({
  customSearchInput,
  disablePortal,
  mode,
}: Readonly<{
  customSearchInput: boolean;
  disablePortal: boolean;
  mode: Exclude<PhoneCountrySelectorMode, 'auto'>;
}>) {
  const [changeCount, setChangeCount] = useState(0);
  const [countryChangeCount, setCountryChangeCount] = useState(0);
  const [countrySelectionCount, setCountrySelectionCount] = useState(0);
  const [consumerKeyDownCount, setConsumerKeyDownCount] = useState(0);
  const [lastKeyDown, setLastKeyDown] = useState<{
    defaultMuiPrevented: boolean;
    defaultPrevented: boolean;
    isComposing: boolean;
    key: string;
  } | null>(null);
  const phone = usePhoneInput({
    defaultCountry: 'US',
    onChange: () => setChangeCount((count) => count + 1),
    onCountryChange: () => setCountryChangeCount((count) => count + 1),
    onCountrySelection: () => setCountrySelectionCount((count) => count + 1),
  });

  return (
    <fieldset
      aria-label="IME selector harness"
      onKeyDown={(event) => {
        const muiEvent = event as typeof event & { defaultMuiPrevented?: boolean };
        setLastKeyDown({
          defaultMuiPrevented: muiEvent.defaultMuiPrevented === true,
          defaultPrevented: event.defaultPrevented,
          isComposing: event.nativeEvent.isComposing,
          key: event.key,
        });
      }}
    >
      <PhoneInputProvider value={phone}>
        <PhoneInputInput aria-label="IME phone" data-testid="ime-phone-input" />
        <PhoneInputCountrySelector
          data-testid="ime-country-trigger"
          disablePortal={disablePortal}
          mode={mode}
          slotProps={{
            searchInput: {
              'data-testid': 'ime-country-search',
              onKeyDown: () => setConsumerKeyDownCount((count) => count + 1),
            },
          }}
          {...(customSearchInput ? { slots: { searchInput: ImeSearchInputSlot } } : {})}
        />
        <output data-testid="ime-controller-state">
          {JSON.stringify({
            detectedCountry: phone.state.numberingPlan.detectedCountry,
            resolvedCountry: phone.state.numberingPlan.resolvedCountry,
            selectedCountry: phone.state.selectedCountry,
            value: phone.state.value ?? null,
          })}
        </output>
        <output data-testid="ime-callback-counts">
          {JSON.stringify({
            change: changeCount,
            countryChange: countryChangeCount,
            countrySelection: countrySelectionCount,
          })}
        </output>
        <output data-testid="ime-consumer-keydown-count">{consumerKeyDownCount}</output>
        <output data-testid="ime-last-keydown">{JSON.stringify(lastKeyDown)}</output>
      </PhoneInputProvider>
    </fieldset>
  );
}

describe('responsive country selector', () => {
  test('gives RTL Arabic and Persian calling-code input the ASCII result and rank', async () => {
    const view = await render(<LocalizedDigitSearchHarness />);

    await userEvent.click(page.getByTestId('localized-digit-trigger'));
    const search = page.getByTestId('localized-digit-search');
    await expect.element(search).toHaveAttribute('dir', 'rtl');

    await userEvent.fill(search, '+375');
    const asciiCountries = Array.from(
      document.querySelectorAll<HTMLElement>('[role="option"][data-country]'),
      (option) => option.dataset.country,
    );
    expect(asciiCountries[0]).toBe('BY');

    for (const query of ['+٣٧٥', '+۳۷۵']) {
      await userEvent.fill(search, query);
      const localizedCountries = Array.from(
        document.querySelectorAll<HTMLElement>('[role="option"][data-country]'),
        (option) => option.dataset.country,
      );
      expect(localizedCountries).toEqual(asciiCountries);
      expect(localizedCountries[0]).toBe('BY');
    }

    await view.unmount();
  });

  test('keeps a filtered uncontrolled default country visible and accurately named', async () => {
    const view = await render(
      <MuiPhoneInput
        defaultCountry="BY"
        label="Filtered default country phone"
        slotProps={{
          countrySelector: {
            'data-testid': 'filtered-default-country-trigger',
            countryFilter: (country) => country !== 'BY',
            mode: 'desktop',
          },
        }}
      />,
    );
    const trigger = page.getByTestId('filtered-default-country-trigger');

    await expect
      .element(trigger)
      .toHaveAccessibleName('Select country. Belarus, BY, +375');
    await expect.element(trigger).toHaveTextContent('BY+375');
    await view.unmount();
  });

  test.each(['controlled', 'resolved'] as const)(
    'keeps a filtered %s country visible and accurately named',
    async (source) => {
      const view = await render(<FilteredActiveCountryHarness source={source} />);
      const trigger = page.getByTestId(`filtered-${source}-desktop-trigger`);
      const input = page.getByTestId(`filtered-${source}-desktop-input`);

      await expect
        .element(trigger)
        .toHaveAccessibleName('Select country. Беларусь, BY, +375');
      await expect.element(trigger).toHaveTextContent('BY+375');
      if (source === 'controlled') {
        await expect.element(input).toHaveAttribute('data-phone-input-country', 'BY');
      } else {
        await expect.element(input).toHaveAttribute('data-phone-input-country', '');
        await expect
          .element(input)
          .toHaveAttribute('data-phone-input-plan', 'geographic');
        await expect.element(input).toHaveValue('+375291234567');
      }
      await view.unmount();
    },
  );

  test.each([
    { disablePortal: false, mode: 'desktop' as const },
    { disablePortal: true, mode: 'desktop' as const },
    { disablePortal: false, mode: 'mobile' as const },
    { disablePortal: true, mode: 'mobile' as const },
  ])(
    'keeps the filtered active country presentation-only in $mode mode with disablePortal=$disablePortal',
    async ({ disablePortal, mode }) => {
      const onChange = vi.fn();
      const onCountryChange = vi.fn();
      const onCountrySelection = vi.fn();
      const view = await render(
        <div data-testid="filtered-active-surface-host">
          <MuiPhoneInput
            defaultCountry="BY"
            label="Strictly filtered active country phone"
            onChange={onChange}
            onCountryChange={onCountryChange}
            onCountrySelection={onCountrySelection}
            slotProps={{
              countrySelector: {
                'data-testid': 'strictly-filtered-active-trigger',
                countryFilter: (country) => country === 'US',
                disablePortal,
                locale: 'be',
                mode,
                resolveCountryName: localizedName,
                slotProps: {
                  searchInput: {
                    'data-testid': 'strictly-filtered-active-search',
                  },
                },
              },
              htmlInput: { 'data-testid': 'strictly-filtered-active-input' },
            }}
          />
        </div>,
      );
      const host = page.getByTestId('filtered-active-surface-host');
      const trigger = page.getByTestId('strictly-filtered-active-trigger');

      await expect
        .element(trigger)
        .toHaveAccessibleName('Select country. Беларусь, BY, +375');
      onChange.mockClear();
      onCountryChange.mockClear();
      onCountrySelection.mockClear();
      await userEvent.click(trigger);
      const search = page.getByTestId('strictly-filtered-active-search');
      await expect.element(search).toHaveFocus();
      expect(host.element().contains(search.element())).toBe(disablePortal);
      expect(
        document.querySelectorAll('[role="option"][data-country="BY"]'),
      ).toHaveLength(0);

      for (const query of ['Беларусь', 'BY', '+375']) {
        await userEvent.fill(search, query);
        expect(
          document.querySelectorAll('[role="option"][data-country="BY"]'),
        ).toHaveLength(0);
        await userEvent.keyboard('{ArrowDown}{Home}{End}{Enter}');
        expect(onChange).not.toHaveBeenCalled();
        expect(onCountryChange).not.toHaveBeenCalled();
        expect(onCountrySelection).not.toHaveBeenCalled();
      }

      await userEvent.fill(search, '');
      for (const key of ['{ArrowDown}', '{Home}', '{End}']) {
        await userEvent.keyboard(key);
        const activeId = search.element().getAttribute('aria-activedescendant');
        const activeOption = activeId ? document.getElementById(activeId) : null;
        expect(activeOption).toHaveAttribute('data-country', 'US');
      }

      expect(onChange).not.toHaveBeenCalled();
      expect(onCountryChange).not.toHaveBeenCalled();
      expect(onCountrySelection).not.toHaveBeenCalled();
      const input = page.getByTestId('strictly-filtered-active-input');
      await expect.element(input).toHaveAttribute('data-phone-input-country', 'BY');
      await expect.element(input).toHaveValue('');
      await view.unmount();
    },
  );

  test.each(['default', 'controlled'] as const)(
    'preserves %s country ownership and callback cardinality while the filter tightens and relaxes',
    async (source) => {
      const view = await render(
        <FilteredActiveCountryHarness initialExcluded={false} source={source} />,
      );
      const trigger = page.getByTestId(`filtered-${source}-desktop-trigger`);
      const input = page.getByTestId(`filtered-${source}-desktop-input`);

      await userEvent.click(trigger);
      expect(
        document.querySelectorAll('[role="option"][data-country="BY"]'),
      ).toHaveLength(1);
      await userEvent.keyboard('{Escape}');

      await userEvent.click(
        page.getByRole('button', { name: 'Exclude active country' }),
      );
      await expect
        .element(trigger)
        .toHaveAccessibleName('Select country. Беларусь, BY, +375');
      await expect.element(input).toHaveAttribute('data-phone-input-country', 'BY');
      await userEvent.click(trigger);
      expect(
        document.querySelectorAll('[role="option"][data-country="BY"]'),
      ).toHaveLength(0);
      await userEvent.keyboard('{Escape}');

      await userEvent.click(
        page.getByRole('button', { name: 'Include active country' }),
      );
      await userEvent.click(trigger);
      expect(
        document.querySelectorAll('[role="option"][data-country="BY"]'),
      ).toHaveLength(1);
      await expect
        .element(page.getByTestId(`filtered-${source}-change-count`))
        .toHaveTextContent('0');
      await expect
        .element(page.getByTestId(`filtered-${source}-country-change-count`))
        .toHaveTextContent('1');
      await expect
        .element(page.getByTestId(`filtered-${source}-country-selection-count`))
        .toHaveTextContent('0');
      await view.unmount();
    },
  );

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
      const view = await render(<FilteredActiveCountryHarness mode={mode} />);

      await userEvent.click(page.getByTestId(`filtered-default-${mode}-trigger`));
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

  test.each([
    { customSearchInput: false, disablePortal: false, mode: 'desktop' as const },
    { customSearchInput: true, disablePortal: true, mode: 'desktop' as const },
    { customSearchInput: true, disablePortal: false, mode: 'mobile' as const },
    { customSearchInput: false, disablePortal: true, mode: 'mobile' as const },
  ])(
    'blocks composing Enter in $mode mode with disablePortal=$disablePortal and customSearchInput=$customSearchInput',
    async ({ customSearchInput, disablePortal, mode }) => {
      const view = await render(
        <ImeCountrySelectorHarness
          customSearchInput={customSearchInput}
          disablePortal={disablePortal}
          mode={mode}
        />,
      );
      const trigger = page.getByTestId('ime-country-trigger');
      const phoneInput = page.getByTestId('ime-phone-input');
      const state = page.getByTestId('ime-controller-state');
      const callbackCounts = page.getByTestId('ime-callback-counts');
      const consumerKeyDownCount = page.getByTestId('ime-consumer-keydown-count');
      const lastKeyDown = page.getByTestId('ime-last-keydown');

      await userEvent.click(trigger);
      const search = page.getByTestId('ime-country-search');
      await userEvent.fill(search, 'Japan');
      const japan = document.querySelector<HTMLElement>(
        '[role="option"][data-country="JP"]',
      );
      expect(japan).toBeInTheDocument();
      await expect.element(search).toHaveAttribute('aria-activedescendant', japan?.id);
      await expect.element(search).toHaveFocus();
      if (customSearchInput) {
        await expect
          .element(search)
          .toHaveAttribute('data-custom-search-input', 'true');
      } else {
        await expect.element(search).not.toHaveAttribute('data-custom-search-input');
      }

      const searchInput = search.element();
      if (!(searchInput instanceof HTMLInputElement)) {
        throw new TypeError('Expected the IME country search input.');
      }
      const stateBeforeComposedEnter = state.element().textContent;
      const callbackCountsBeforeComposedEnter = callbackCounts.element().textContent;
      const callbackBaseline = JSON.parse(callbackCountsBeforeComposedEnter ?? '') as {
        change: number;
        countryChange: number;
        countrySelection: number;
      };
      const activeDescendantBeforeComposedEnter = searchInput.getAttribute(
        'aria-activedescendant',
      );
      searchInput.dispatchEvent(
        new CompositionEvent('compositionstart', {
          bubbles: true,
          composed: true,
          data: 'Japan',
        }),
      );
      const composedEnter = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        composed: true,
        isComposing: true,
        key: 'Enter',
      });
      const imeDefaultAllowed = searchInput.dispatchEvent(composedEnter);

      await expect.element(lastKeyDown).toHaveTextContent(
        JSON.stringify({
          defaultMuiPrevented: true,
          defaultPrevented: false,
          isComposing: true,
          key: 'Enter',
        }),
      );
      await expect.element(consumerKeyDownCount).toHaveTextContent('1');
      expect(imeDefaultAllowed).toBe(true);
      expect(composedEnter.defaultPrevented).toBe(false);
      expect(state.element().textContent).toBe(stateBeforeComposedEnter);
      expect(callbackCounts.element().textContent).toBe(
        callbackCountsBeforeComposedEnter,
      );
      await expect.element(phoneInput).toHaveValue('');
      await expect.element(search).toHaveValue('Japan');
      await expect.element(search).toHaveFocus();
      await expect.element(trigger).toHaveAttribute('aria-expanded', 'true');
      await expect
        .element(search)
        .toHaveAttribute('aria-activedescendant', activeDescendantBeforeComposedEnter);
      expect(japan).toBeInTheDocument();

      if (customSearchInput) {
        await waitForOpaqueAncestors(searchInput);
        const results = await axe.run(document.body, {
          runOnly: {
            type: 'tag',
            values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
          },
        });
        const violations = summarizeAxeViolations(results.violations);
        expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
      }

      searchInput.dispatchEvent(
        new CompositionEvent('compositionend', {
          bubbles: true,
          composed: true,
          data: 'Japan',
        }),
      );
      await userEvent.keyboard('{Enter}');

      await expect.element(callbackCounts).toHaveTextContent(
        JSON.stringify({
          change: callbackBaseline.change + 1,
          countryChange: callbackBaseline.countryChange + 1,
          countrySelection: callbackBaseline.countrySelection + 1,
        }),
      );
      await expect.element(consumerKeyDownCount).toHaveTextContent('2');
      await expect.element(phoneInput).toHaveValue('+81');
      await expect.element(trigger).toHaveFocus();
      await expect.element(trigger).toHaveAttribute('aria-expanded', 'false');
      await expect.element(search).not.toBeInTheDocument();
      expect(JSON.parse(state.element().textContent ?? '')).toMatchObject({
        resolvedCountry: 'JP',
        selectedCountry: 'JP',
        value: '+81',
      });
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
