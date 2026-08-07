import { createTheme, ThemeProvider } from '@mui/material/styles';
import axe from 'axe-core';
import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import rawMaxMetadata from 'libphonenumber-js/metadata.max.json';
import {
  type ChangeEvent,
  type ClipboardEvent,
  type ComponentProps,
  StrictMode,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  formatPhoneInputPresentation,
  type PhoneInputDisplayMode,
  type MuiPhoneInputOwnerState,
  type PhoneExtension,
  type PhoneInputChangeDetails,
  type PhoneValidationMode,
  type PhoneValue,
  validatePhoneMetadata,
} from '../../packages/mui-phone-input/src';

function ControlledHarness({
  acceptChanges = true,
  initialValue,
  metadata,
  onCountryChange,
  onCountrySelection,
  selectedCountry,
}: Readonly<{
  acceptChanges?: boolean;
  initialValue?: PhoneValue;
  metadata?: ComponentProps<typeof MuiPhoneInput>['metadata'];
  onCountryChange?: ComponentProps<typeof MuiPhoneInput>['onCountryChange'];
  onCountrySelection?: ComponentProps<typeof MuiPhoneInput>['onCountrySelection'];
  selectedCountry?: CountryCode | null;
}> = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<PhoneValue>(initialValue);
  const [callbackCount, setCallbackCount] = useState(0);
  const [details, setDetails] = useState<PhoneInputChangeDetails>();

  return (
    <>
      <MuiPhoneInput
        label="Controlled phone"
        onChange={(nextValue, nextDetails) => {
          if (acceptChanges) {
            setValue(nextValue);
          }
          setDetails(nextDetails);
          setCallbackCount((count) => count + 1);
        }}
        ref={inputRef}
        slotProps={{ htmlInput: { 'data-testid': 'controlled-phone' } }}
        value={value}
        {...(metadata === undefined ? {} : { metadata })}
        {...(onCountryChange === undefined ? {} : { onCountryChange })}
        {...(onCountrySelection === undefined ? {} : { onCountrySelection })}
        {...(selectedCountry === undefined ? {} : { selectedCountry })}
      />
      <output data-testid="controlled-value">{value ?? ''}</output>
      <output data-testid="controlled-callback-count">{callbackCount}</output>
      <output data-testid="controlled-details">
        {details ? JSON.stringify(details) : ''}
      </output>
      <button
        onClick={() => {
          setValue(details?.value);
        }}
        type="button"
      >
        Apply latest controlled value
      </button>
      <button
        onClick={() => {
          setValue(undefined);
        }}
        type="button"
      >
        Reset controlled value
      </button>
      <button
        onClick={() => {
          inputRef.current?.focus();
        }}
        type="button"
      >
        Focus controlled phone
      </button>
    </>
  );
}

function UncontrolledHarness() {
  const [callbackCount, setCallbackCount] = useState(0);
  const [latestValue, setLatestValue] = useState<PhoneValue>();

  return (
    <form>
      <MuiPhoneInput
        defaultValue="+1202"
        label="Uncontrolled phone"
        onChange={(value) => {
          setLatestValue(value);
          setCallbackCount((count) => count + 1);
        }}
        required
        slotProps={{ htmlInput: { 'data-testid': 'uncontrolled-phone' } }}
      />
      <output data-testid="uncontrolled-value">{latestValue ?? ''}</output>
      <output data-testid="uncontrolled-callback-count">{callbackCount}</output>
      <button type="reset">Reset uncontrolled form</button>
    </form>
  );
}

function UncontrolledNationalHarness() {
  const [details, setDetails] = useState<PhoneInputChangeDetails>();
  const [latestValue, setLatestValue] = useState<PhoneValue>();

  return (
    <>
      <MuiPhoneInput
        defaultCountry="BY"
        onChange={(value, nextDetails) => {
          setLatestValue(value);
          setDetails(nextDetails);
        }}
        slotProps={{ htmlInput: { 'data-testid': 'uncontrolled-national-phone' } }}
      />
      <output data-testid="uncontrolled-national-value">{latestValue ?? ''}</output>
      <output data-testid="uncontrolled-national-details">
        {details ? JSON.stringify(details) : ''}
      </output>
    </>
  );
}

function FormattingModeHarness() {
  const [displayMode, setDisplayMode] =
    useState<PhoneInputDisplayMode>('international');
  const [locale, setLocale] = useState('en');
  const [masked, setMasked] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');

  return (
    <>
      <MuiPhoneInput
        displayMode={displayMode}
        locale={locale}
        selectedCountry={selectedCountry}
        slotProps={{ htmlInput: { 'data-testid': 'formatting-phone' } }}
        value="+12025550123"
        {...(masked ? { displayMask: { pattern: '###.###.####' } } : {})}
      />
      <button onClick={() => setDisplayMode('national')} type="button">
        Use national display
      </button>
      <button onClick={() => setMasked(true)} type="button">
        Use display mask
      </button>
      <button onClick={() => setLocale('fr')} type="button">
        Use French locale
      </button>
      <button onClick={() => setSelectedCountry('CA')} type="button">
        Use Canada country
      </button>
    </>
  );
}

function HistoryContextHarness() {
  const [details, setDetails] = useState<PhoneInputChangeDetails>();
  const [extension, setExtension] = useState<PhoneExtension>('5');
  const [masked, setMasked] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('US');
  const [value, setValue] = useState<PhoneValue>('+12025550123');

  return (
    <>
      <MuiPhoneInput
        displayMode="national"
        extension={extension}
        extensionLabel="History extension"
        extensionPresentation="separate"
        onChange={(nextValue, nextDetails) => {
          setValue(nextValue);
          setDetails(nextDetails);
        }}
        onExtensionChange={setExtension}
        selectedCountry={selectedCountry}
        slotProps={{ htmlInput: { 'data-testid': 'history-context-phone' } }}
        value={value}
        {...(masked ? { displayMask: { pattern: '####.####.###' } } : {})}
      />
      <output data-testid="history-context-country">{selectedCountry}</output>
      <output data-testid="history-context-extension">{extension ?? ''}</output>
      <output data-testid="history-context-reason">{details?.reason ?? ''}</output>
      <output data-testid="history-context-value">{value ?? ''}</output>
      <button
        onClick={() => {
          setSelectedCountry('GB');
          setExtension('88');
          setMasked(true);
          setValue('+442079460958');
        }}
        type="button"
      >
        Apply current history context
      </button>
    </>
  );
}

function DisplayModeEditingHarness({
  displayMode,
}: Readonly<{ displayMode: PhoneInputDisplayMode }>) {
  const [latestValue, setLatestValue] = useState<PhoneValue>();

  return (
    <>
      <MuiPhoneInput
        defaultCountry="US"
        displayMode={displayMode}
        onChange={setLatestValue}
        slotProps={{ htmlInput: { 'data-testid': 'display-mode-editing-phone' } }}
      />
      <output data-testid="display-mode-editing-value">{latestValue ?? ''}</output>
    </>
  );
}

function OwnershipSwitchHarness() {
  const [controlled, setControlled] = useState(false);

  return (
    <>
      <MuiPhoneInput
        label="Ownership phone"
        slotProps={{ htmlInput: { 'data-testid': 'ownership-phone' } }}
        {...(controlled
          ? { value: '+44' as const }
          : { defaultValue: '+1202' as const })}
      />
      <button
        onClick={() => {
          setControlled(true);
        }}
        type="button"
      >
        Switch ownership
      </button>
    </>
  );
}

function PreventedPasteHarness() {
  const [details, setDetails] = useState<PhoneInputChangeDetails>();
  const [value, setValue] = useState<PhoneValue>();

  return (
    <>
      <MuiPhoneInput
        onChange={(nextValue, nextDetails) => {
          setValue(nextValue);
          setDetails(nextDetails);
        }}
        slotProps={{
          htmlInput: {
            'data-testid': 'prevented-paste-phone',
            onPaste: (event: ClipboardEvent<HTMLInputElement>) =>
              event.preventDefault(),
          },
        }}
        value={value}
      />
      <output data-testid="prevented-paste-details">
        {details ? JSON.stringify(details) : ''}
      </output>
    </>
  );
}

function ExternalNumberingHarness() {
  const [value, setValue] = useState<PhoneValue>('+1');
  const [callbackCount, setCallbackCount] = useState(0);
  const [details, setDetails] = useState<PhoneInputChangeDetails>();

  return (
    <>
      <MuiPhoneInput
        onChange={(nextValue, nextDetails) => {
          setValue(nextValue);
          setDetails(nextDetails);
          setCallbackCount((count) => count + 1);
        }}
        selectedCountry="CA"
        slotProps={{ htmlInput: { 'data-testid': 'external-numbering-phone' } }}
        value={value}
      />
      <output data-testid="external-numbering-callback-count">{callbackCount}</output>
      <output data-testid="external-numbering-details">
        {details ? JSON.stringify(details) : ''}
      </output>
      <button
        onClick={() => {
          setValue('+12025550123');
        }}
        type="button"
      >
        Set external US number
      </button>
    </>
  );
}

function LayoutEffectTransactionHarness({
  onChange,
}: Readonly<{ onChange: (value: PhoneValue) => void }>) {
  const inputRef = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) {
      throw new Error('Missing layout-effect phone input.');
    }

    setNativeInputValue(input, '+12');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '12',
        inputType: 'insertText',
      }),
    );
  }, []);

  return (
    <MuiPhoneInput
      onChange={onChange}
      ref={inputRef}
      slotProps={{ htmlInput: { 'data-testid': 'layout-effect-phone' } }}
      value={undefined}
    />
  );
}

type ValidationHarnessProps = Readonly<{
  allowedNumberTypes?: readonly PhoneNumberType[];
  required?: boolean;
  validationDisplay?: 'always' | 'blur' | 'never';
  validationMessage?: string;
  validationMode?: PhoneValidationMode;
}>;

function ValidationHarness({
  allowedNumberTypes,
  required = false,
  validationDisplay,
  validationMessage,
  validationMode,
}: ValidationHarnessProps = {}) {
  const [value, setValue] = useState<PhoneValue>();
  const [details, setDetails] = useState<PhoneInputChangeDetails>();

  return (
    <>
      <MuiPhoneInput
        label="Validation phone"
        onChange={(nextValue, nextDetails) => {
          setValue(nextValue);
          setDetails(nextDetails);
        }}
        required={required}
        slotProps={{ htmlInput: { 'data-testid': 'validation-phone' } }}
        value={value}
        {...(allowedNumberTypes ? { allowedNumberTypes } : {})}
        {...(validationDisplay ? { validationDisplay } : {})}
        {...(validationMessage ? { validationMessage } : {})}
        {...(validationMode ? { validationMode } : {})}
      />
      <output data-testid="validation-details">
        {details ? JSON.stringify(details) : ''}
      </output>
    </>
  );
}

function CustomHtmlInput({
  ownerState: _ownerState,
  ...props
}: ComponentProps<'input'> & {
  ownerState?: unknown;
}) {
  return <input {...props} data-custom-phone-slot="true" />;
}

function CustomFormHelperText({
  ownerState: _ownerState,
  ...props
}: ComponentProps<'p'> & {
  ownerState?: unknown;
}) {
  return <p {...props} data-custom-helper-slot="true" />;
}

async function pasteText(inputTestId: string, text: string) {
  const locator = page.getByTestId(inputTestId);
  await expect.element(locator).toBeInTheDocument();
  const input = locator.element();

  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Expected a native phone input.');
  }

  input.focus();
  input.select();
  const transfer = new DataTransfer();
  transfer.setData('text/plain', text);
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: transfer,
  });
  input.dispatchEvent(pasteEvent);

  if (pasteEvent.defaultPrevented) {
    return;
  }

  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: text,
    inputType: 'insertFromPaste',
  });
  input.dispatchEvent(beforeInput);

  if (!beforeInput.defaultPrevented) {
    input.setRangeText(
      text,
      input.selectionStart ?? 0,
      input.selectionEnd ?? input.value.length,
      'end',
    );
  }
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: text,
      inputType: 'insertFromPaste',
    }),
  );
}

function setNativeInputValue(input: HTMLInputElement, value: string): void {
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;
  if (!nativeValueSetter) {
    throw new Error('Missing native input value setter.');
  }

  nativeValueSetter.call(input, value);
}

function replaceCompleteInputValue(
  input: HTMLInputElement,
  value: string,
  createInputEvent: () => Event = () =>
    new InputEvent('input', {
      bubbles: true,
      data: value,
      inputType: 'insertReplacementText',
    }),
): void {
  input.focus();
  input.select();
  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: value,
    inputType: 'insertReplacementText',
  });
  input.dispatchEvent(beforeInput);

  if (!beforeInput.defaultPrevented) {
    input.setRangeText(value, 0, input.value.length, 'end');
  }
  input.dispatchEvent(createInputEvent());
}

function replaceInputRange(
  input: HTMLInputElement,
  value: string,
  selectionStart: number,
  selectionEnd: number,
): void {
  input.focus();
  input.setSelectionRange(selectionStart, selectionEnd);
  const beforeInput = new InputEvent('beforeinput', {
    bubbles: true,
    cancelable: true,
    data: value,
    inputType: 'insertReplacementText',
  });
  input.dispatchEvent(beforeInput);

  if (!beforeInput.defaultPrevented) {
    input.setRangeText(value, selectionStart, selectionEnd, 'end');
  }
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: value,
      inputType: 'insertReplacementText',
    }),
  );
}

function dispatchCompositionTransaction(
  input: HTMLInputElement,
  fullDisplayValue: string,
  fragment: string,
  selection: Readonly<{ after: number; beforeEnd?: number; beforeStart: number }>,
): void {
  input.focus();
  input.setSelectionRange(
    selection.beforeStart,
    selection.beforeEnd ?? selection.beforeStart,
  );
  input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
  setNativeInputValue(input, fullDisplayValue);
  input.setSelectionRange(selection.after, selection.after);
  input.dispatchEvent(
    new InputEvent('input', {
      bubbles: true,
      data: fragment,
      inputType: 'insertCompositionText',
      isComposing: true,
    }),
  );
  input.dispatchEvent(
    new CompositionEvent('compositionend', {
      bubbles: true,
      data: fragment,
    }),
  );
}

function countDigitsBeforeCaret(input: HTMLInputElement): number {
  const selectionStart = input.selectionStart ?? input.value.length;
  return Array.from(input.value.slice(0, selectionStart)).filter((character) =>
    /\d/u.test(character),
  ).length;
}

describe('MuiPhoneInput tracer', () => {
  test('forwards cleanup returned by the public callback ref on unmount', async () => {
    const attachments: HTMLInputElement[] = [];
    let cleanupCount = 0;
    let nullCount = 0;
    const view = await render(
      <MuiPhoneInput
        ref={(input) => {
          if (!input) {
            nullCount += 1;
            return;
          }

          attachments.push(input);
          return () => {
            cleanupCount += 1;
          };
        }}
        slotProps={{ htmlInput: { 'data-testid': 'cleanup-ref-phone' } }}
      />,
    );
    const input = page.getByTestId('cleanup-ref-phone');
    await expect.element(input).toBeInTheDocument();

    expect(attachments).toEqual([input.element()]);
    expect(cleanupCount).toBe(0);
    expect(nullCount).toBe(0);

    await view.unmount();

    expect(cleanupCount).toBe(1);
    expect(nullCount).toBe(0);
  });

  test('preserves null detachment for a void public callback ref', async () => {
    const values: Array<HTMLInputElement | null> = [];
    const view = await render(
      <MuiPhoneInput
        ref={(input) => {
          values.push(input);
        }}
        slotProps={{ htmlInput: { 'data-testid': 'void-ref-phone' } }}
      />,
    );
    const input = page.getByTestId('void-ref-phone');
    await expect.element(input).toBeInTheDocument();
    const inputElement = input.element();

    expect(values).toEqual([inputElement]);

    await view.unmount();

    expect(values).toEqual([inputElement, null]);
  });

  test('sets and clears an object public ref', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    const view = await render(
      <MuiPhoneInput
        ref={inputRef}
        slotProps={{ htmlInput: { 'data-testid': 'object-ref-phone' } }}
      />,
    );
    const input = page.getByTestId('object-ref-phone');
    await expect.element(input).toBeInTheDocument();

    expect(inputRef.current).toBe(input.element());

    await view.unmount();

    expect(inputRef.current).toBeNull();
  });

  test('cleans the previous callback ref before attaching its replacement', async () => {
    const events: string[] = [];
    const firstRef = (input: HTMLInputElement | null) => {
      if (!input) {
        events.push('first:null');
        return;
      }

      events.push('first:attach');
      return () => {
        events.push('first:cleanup');
      };
    };
    const secondRef = (input: HTMLInputElement | null) => {
      if (!input) {
        events.push('second:null');
        return;
      }

      events.push('second:attach');
      return () => {
        events.push('second:cleanup');
      };
    };

    function RefIdentityHarness() {
      const [useSecondRef, setUseSecondRef] = useState(false);

      return (
        <>
          <MuiPhoneInput
            ref={useSecondRef ? secondRef : firstRef}
            slotProps={{ htmlInput: { 'data-testid': 'replacement-ref-phone' } }}
          />
          <button onClick={() => setUseSecondRef(true)} type="button">
            Replace public ref
          </button>
        </>
      );
    }

    const view = await render(<RefIdentityHarness />);
    const input = page.getByTestId('replacement-ref-phone');
    await expect.element(input).toBeInTheDocument();
    expect(events).toEqual(['first:attach']);

    await userEvent.click(page.getByRole('button', { name: 'Replace public ref' }));

    expect(events).toEqual(['first:attach', 'first:cleanup', 'second:attach']);

    await view.unmount();

    expect(events).toEqual([
      'first:attach',
      'first:cleanup',
      'second:attach',
      'second:cleanup',
    ]);
  });

  test('keeps cleanup-returning callback refs balanced in Strict Mode', async () => {
    let attachmentCount = 0;
    let cleanupCount = 0;
    let nullCount = 0;
    const view = await render(
      <StrictMode>
        <MuiPhoneInput
          ref={(input) => {
            if (!input) {
              nullCount += 1;
              return;
            }

            attachmentCount += 1;
            return () => {
              cleanupCount += 1;
            };
          }}
          slotProps={{ htmlInput: { 'data-testid': 'strict-ref-phone' } }}
        />
      </StrictMode>,
    );
    await expect.element(page.getByTestId('strict-ref-phone')).toBeInTheDocument();

    expect(attachmentCount).toBeGreaterThan(0);
    expect(cleanupCount).toBe(attachmentCount - 1);
    expect(nullCount).toBe(0);

    await view.unmount();

    expect(cleanupCount).toBe(attachmentCount);
    expect(nullCount).toBe(0);
  });

  test('preserves cleanup refs through a custom native input slot', async () => {
    let publicInput: HTMLInputElement | null = null;
    let slotInput: HTMLInputElement | null = null;
    let publicCleanupCount = 0;
    let slotCleanupCount = 0;
    let publicNullCount = 0;
    let slotNullCount = 0;
    const view = await render(
      <MuiPhoneInput
        ref={(input) => {
          if (!input) {
            publicNullCount += 1;
            return;
          }

          publicInput = input;
          return () => {
            publicCleanupCount += 1;
          };
        }}
        slots={{ htmlInput: CustomHtmlInput }}
        slotProps={{
          htmlInput: {
            'data-testid': 'custom-cleanup-ref-phone',
            ref: (input: HTMLInputElement | null) => {
              if (!input) {
                slotNullCount += 1;
                return;
              }

              slotInput = input;
              return () => {
                slotCleanupCount += 1;
              };
            },
          },
        }}
      />,
    );
    const input = page.getByTestId('custom-cleanup-ref-phone');
    await expect.element(input).toHaveAttribute('data-custom-phone-slot', 'true');

    expect(publicInput).toBe(input.element());
    expect(slotInput).toBe(input.element());

    await view.unmount();

    expect(publicCleanupCount).toBe(1);
    expect(slotCleanupCount).toBe(1);
    expect(publicNullCount).toBe(0);
    expect(slotNullCount).toBe(0);
  });

  test('composes controller, native-slot, and public refs on the same input', async () => {
    const onChange = vi.fn();
    const publicValues: Array<HTMLInputElement | null> = [];
    const slotValues: Array<HTMLInputElement | null> = [];
    const view = await render(
      <MuiPhoneInput
        defaultValue="+1"
        onChange={onChange}
        ref={(input) => {
          publicValues.push(input);
        }}
        slots={{ htmlInput: CustomHtmlInput }}
        slotProps={{
          htmlInput: {
            'data-testid': 'composed-ref-phone',
            ref: (input: HTMLInputElement | null) => {
              slotValues.push(input);
            },
          },
        }}
      />,
    );
    const input = page.getByTestId('composed-ref-phone');
    await expect.element(input).toBeInTheDocument();
    const inputElement = input.element();

    expect(publicValues).toEqual([inputElement]);
    expect(slotValues).toEqual([inputElement]);

    await userEvent.type(input, '2');

    await expect.element(input).toHaveValue('+1 2');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      '+12',
      expect.objectContaining({ reason: 'input', value: '+12' }),
    );

    await view.unmount();

    expect(publicValues).toEqual([inputElement, null]);
    expect(slotValues).toEqual([inputElement, null]);
  });

  test('commits Unicode digits only after composition ends', async () => {
    render(<ControlledHarness />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setNativeInputValue(input, '+١٢٣');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '١٢٣',
        inputType: 'insertCompositionText',
        isComposing: true,
      }),
    );

    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('0');

    input.dispatchEvent(
      new CompositionEvent('compositionend', {
        bubbles: true,
        data: '+١٢٣',
      }),
    );

    await expect.element(locator).toHaveValue('+1 23');
    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+123');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('composition');
  });

  test('does not revive a national draft after a genuine composition with trailing input', async () => {
    render(<ControlledHarness selectedCountry="BY" />);
    const locator = page.getByTestId('controlled-phone');
    await userEvent.type(locator, '02912');
    await expect.element(locator).toHaveValue('+02912');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setNativeInputValue(input, '+02912٣');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '٣',
        inputType: 'insertCompositionText',
        isComposing: true,
      }),
    );
    input.dispatchEvent(
      new CompositionEvent('compositionend', {
        bubbles: true,
        data: '٣',
      }),
    );
    setNativeInputValue(input, '+02912٣');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '٣',
        inputType: 'insertCompositionText',
        isComposing: false,
      }),
    );

    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+029123');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('composition');

    await userEvent.type(locator, '4567');
    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+0291234567');
  });

  test('preserves an existing draft when compositionend data is only the inserted fragment', async () => {
    render(<ControlledHarness initialValue="+375" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+375');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    dispatchCompositionTransaction(input, '+375١٢', '١٢', {
      after: 6,
      beforeStart: 4,
    });

    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+37512');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.previousValue).toBe('+375');
    expect(details.reason).toBe('composition');
    expect(details.value).toBe('+37512');
  });

  test('commits an observed empty field instead of compositionend fragment data', async () => {
    render(<ControlledHarness initialValue="+375" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+375');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setNativeInputValue(input, '');
    input.setSelectionRange(0, 0);
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '١٢',
        inputType: 'insertCompositionText',
        isComposing: true,
      }),
    );
    input.dispatchEvent(
      new CompositionEvent('compositionend', {
        bubbles: true,
        data: '١٢',
      }),
    );

    await expect.element(locator).toHaveValue('');
    await expect.element(page.getByTestId('controlled-value')).toHaveTextContent('');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('composition');
    expect(details.value).toBeUndefined();
  });

  test.each([
    {
      expectedDigitsBeforeCaret: 2,
      expectedValue: '+9837512' as const,
      fragment: '٩٨',
      fullDisplayValue: '+٩٨37512',
      initialValue: '+37512' as const,
      name: 'start insertion',
      selection: { after: 3, beforeStart: 1 },
    },
    {
      expectedDigitsBeforeCaret: 5,
      expectedValue: '+3759812' as const,
      fragment: '٩٨',
      fullDisplayValue: '+375٩٨12',
      initialValue: '+37512' as const,
      name: 'middle insertion',
      selection: { after: 6, beforeStart: 4 },
    },
    {
      expectedDigitsBeforeCaret: 5,
      expectedValue: '+3759834' as const,
      fragment: '٩٨',
      fullDisplayValue: '+375٩٨34',
      initialValue: '+3751234' as const,
      name: 'range replacement',
      selection: { after: 6, beforeEnd: 6, beforeStart: 4 },
    },
  ])(
    'preserves unaffected digits and logical caret for $name',
    async ({
      expectedDigitsBeforeCaret,
      expectedValue,
      fragment,
      fullDisplayValue,
      initialValue,
      selection,
    }) => {
      render(<ControlledHarness initialValue={initialValue} />);
      const locator = page.getByTestId('controlled-phone');
      await expect.element(locator).toBeInTheDocument();
      const input = locator.element();

      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Expected the native phone input.');
      }

      dispatchCompositionTransaction(input, fullDisplayValue, fragment, selection);

      await expect
        .element(page.getByTestId('controlled-value'))
        .toHaveTextContent(expectedValue);
      await expect
        .element(page.getByTestId('controlled-callback-count'))
        .toHaveTextContent('1');
      expect(countDigitsBeforeCaret(input)).toBe(expectedDigitsBeforeCaret);
      expect(input.selectionStart).toBeLessThanOrEqual(input.value.length);
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.previousValue).toBe(initialValue);
      expect(details.reason).toBe('composition');
      expect(details.value).toBe(expectedValue);
    },
  );

  test('discards a rejected composition caret before a later external update', async () => {
    render(<ControlledHarness acceptChanges={false} initialValue="+37512" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+375 12');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    dispatchCompositionTransaction(input, '+٩٨37512', '٩٨', {
      after: 3,
      beforeStart: 1,
    });

    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+37512');

    const applyButton = page
      .getByRole('button', { name: 'Apply latest controlled value' })
      .element();
    if (!(applyButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the controlled apply button.');
    }
    applyButton.click();

    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+9837512');
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  test('controls a canonical incomplete Phone Value with serializable details', async () => {
    render(
      <StrictMode>
        <ControlledHarness />
      </StrictMode>,
    );
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '37529');

    await expect.element(input).toHaveValue('+375 29');
    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+37529');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('5');

    const serializedDetails = page
      .getByTestId('controlled-details')
      .element().textContent;
    const details = JSON.parse(serializedDetails ?? '') as PhoneInputChangeDetails;

    expect(details.value).toBe('+37529');
    expect(details.previousValue).toBe('+3752');
    expect(details.reason).toBe('input');
    expect(details.validation).toEqual({
      accepted: false,
      isPossible: false,
      isValid: false,
      mode: 'possible',
      numberType: null,
      reason: 'too-short',
      status: 'incomplete',
      value: '+37529',
    });
    expect(details.numberingPlan).toEqual({
      countryCallingCode: '375',
      detectedCountry: 'BY',
      kind: 'geographic',
      possibleCountries: ['BY'],
      resolvedCountry: 'BY',
      selectedCountry: null,
    });
    expect(serializedDetails).not.toMatch(/nativeEvent|synthetic|target/u);
  });

  test.each([
    {
      createEvent: () => new Event('input', { bubbles: true }),
      expectedReason: 'input',
      initialValue: undefined,
      name: 'plain input without InputEvent metadata',
      nextValue: '+1202',
    },
    {
      createEvent: () =>
        new InputEvent('input', {
          bubbles: true,
          data: '+1202',
          inputType: 'insertFromPaste',
        }),
      expectedReason: 'paste',
      initialValue: undefined,
      name: 'paste',
      nextValue: '+1202',
    },
    {
      createEvent: () =>
        new InputEvent('input', {
          bubbles: true,
          data: '3',
          inputType: 'insertReplacementText',
        }),
      expectedReason: 'replacement',
      initialValue: '+1202' as const,
      name: 'replacement',
      nextValue: '+1203',
    },
    {
      createEvent: () =>
        new InputEvent('input', {
          bubbles: true,
          data: null,
          inputType: 'deleteContentBackward',
        }),
      expectedReason: 'delete',
      initialValue: '+1202' as const,
      name: 'deletion',
      nextValue: '+120',
    },
    {
      createEvent: () =>
        new InputEvent('input', {
          bubbles: true,
          data: null,
          inputType: 'historyUndo',
        }),
      expectedReason: 'history-undo',
      initialValue: '+1202' as const,
      name: 'undo',
      nextValue: '+1203',
    },
    {
      createEvent: () =>
        new InputEvent('input', {
          bubbles: true,
          data: null,
          inputType: 'historyRedo',
        }),
      expectedReason: 'history-redo',
      initialValue: '+1202' as const,
      name: 'redo',
      nextValue: '+1203',
    },
  ])(
    'classifies $name as one authoritative input commit',
    async ({ createEvent, expectedReason, initialValue, nextValue }) => {
      render(<ControlledHarness initialValue={initialValue} />);
      const locator = page.getByTestId('controlled-phone');
      await expect.element(locator).toBeInTheDocument();
      const input = locator.element();

      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Expected the native phone input.');
      }

      setNativeInputValue(input, nextValue);
      input.dispatchEvent(createEvent());

      await expect
        .element(locator)
        .toHaveValue(
          formatPhoneInputPresentation(nextValue as PhoneValue).displayValue,
        );
      await expect
        .element(page.getByTestId('controlled-callback-count'))
        .toHaveTextContent('1');
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.reason).toBe(expectedReason);
      expect(details.value).toBe(nextValue);
    },
  );

  test.each([
    ['historyUndo', 'history-undo'],
    ['historyRedo', 'history-redo'],
  ] as const)(
    'preserves the %s transaction reason when history restores the empty value',
    async (inputType, expectedReason) => {
      render(<ControlledHarness initialValue="+1202" />);
      const locator = page.getByTestId('controlled-phone');
      await expect.element(locator).toHaveValue('+1 202');
      const input = locator.element();

      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Expected the native phone input.');
      }

      setNativeInputValue(input, '');
      input.dispatchEvent(
        new InputEvent('input', {
          bubbles: true,
          data: null,
          inputType,
        }),
      );

      await expect.element(locator).toHaveValue('');
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.reason).toBe(expectedReason);
      expect(details.value).toBeUndefined();
    },
  );

  test('keeps current country, mask, and extension authority across undo and redo', async () => {
    render(<HistoryContextHarness />);
    const locator = page.getByTestId('history-context-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    await userEvent.click(
      page.getByRole('button', { name: 'Apply current history context' }),
    );
    await expect
      .element(page.getByTestId('history-context-country'))
      .toHaveTextContent('GB');
    await expect
      .element(page.getByTestId('history-context-extension'))
      .toHaveTextContent('88');
    await expect.element(locator).toHaveValue(expect.stringContaining('.'));

    setNativeInputValue(input, '+442079460018');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: null,
        inputType: 'historyUndo',
      }),
    );

    await expect
      .element(page.getByTestId('history-context-value'))
      .toHaveTextContent('+442079460018');
    await expect
      .element(page.getByTestId('history-context-reason'))
      .toHaveTextContent('history-undo');
    await expect
      .element(page.getByTestId('history-context-country'))
      .toHaveTextContent('GB');
    await expect
      .element(page.getByTestId('history-context-extension'))
      .toHaveTextContent('88');
    await expect.element(locator).toHaveValue(expect.stringContaining('.'));

    setNativeInputValue(input, '+442079460958');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: null,
        inputType: 'historyRedo',
      }),
    );

    await expect
      .element(page.getByTestId('history-context-value'))
      .toHaveTextContent('+442079460958');
    await expect
      .element(page.getByTestId('history-context-reason'))
      .toHaveTextContent('history-redo');
    await expect
      .element(page.getByTestId('history-context-extension'))
      .toHaveTextContent('88');
    await expect.element(locator).toHaveValue(expect.stringContaining('.'));
  });

  test('restores a controlled value when the parent ignores an edit without rerendering', async () => {
    const onChange = vi.fn();
    render(
      <MuiPhoneInput
        onChange={onChange}
        slotProps={{ htmlInput: { 'data-testid': 'static-controlled-phone' } }}
        value="+1202"
      />,
    );
    const locator = page.getByTestId('static-controlled-phone');
    await expect.element(locator).toHaveValue('+1 202');

    await userEvent.type(locator, '3');

    await expect.element(locator).toHaveValue('+1 202');
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0]?.[1].previousValue).toBe('+1202');

    await userEvent.type(locator, '4');

    await expect.element(locator).toHaveValue('+1 202');
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1]?.[0]).toBe('+12024');
    expect(onChange.mock.calls[1]?.[1].previousValue).toBe('+1202');
  });

  test('restores a selected country calling code for complete-field iOS autofill', async () => {
    const onCountryChange = vi.fn();
    const onCountrySelection = vi.fn();
    render(
      <StrictMode>
        <ControlledHarness
          initialValue="+14155552671"
          onCountryChange={onCountryChange}
          onCountrySelection={onCountrySelection}
          selectedCountry="US"
        />
      </StrictMode>,
    );
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '2025550123');

    await expect.element(locator).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+12025550123');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.previousValue).toBe('+14155552671');
    expect(details.reason).toBe('replacement');
    expect(details.value).toBe('+12025550123');
    expect(details.numberingPlan.selectedCountry).toBe('US');
    expect(
      onCountryChange.mock.calls.filter(([, change]) => change.reason === 'input'),
    ).toHaveLength(0);
    expect(onCountrySelection).not.toHaveBeenCalled();
    expect(input.selectionStart).toBe(input.value.length);
    expect(input.selectionEnd).toBe(input.value.length);
  });

  test('accepts country-stripped autofill once for an explicit territory whose parent plan is detected globally', async () => {
    const onCountryChange = vi.fn();
    render(
      <ControlledHarness
        initialValue="+358412345678"
        onCountryChange={onCountryChange}
        selectedCountry="AX"
      />,
    );
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+358 41 2345678');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '412345678');

    await expect.element(locator).toHaveValue('+358 41 2345678');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.previousValue).toBe('+358412345678');
    expect(details.reason).toBe('replacement');
    expect(details.value).toBe('+358412345678');
    expect(details.numberingPlan).toMatchObject({
      detectedCountry: 'FI',
      resolvedCountry: 'AX',
      selectedCountry: 'AX',
    });
    expect(
      onCountryChange.mock.calls.filter(([, change]) => change.reason === 'input'),
    ).toHaveLength(0);
  });

  test.each([
    {
      country: 'US',
      expected: '+12005550123',
      expectedResolvedCountry: null,
      expectedSelectedCountry: null,
      initialValue: '+12025550123' as const,
      national: '2005550123',
    },
    {
      country: 'BY',
      expected: '+375201234567',
      expectedResolvedCountry: 'BY',
      expectedSelectedCountry: null,
      initialValue: '+375291234567' as const,
      national: '201234567',
    },
  ] as const)(
    'commits possible-but-not-valid $country autofill through the default validation policy',
    async ({
      country,
      expected,
      expectedResolvedCountry,
      expectedSelectedCountry,
      initialValue,
      national,
    }) => {
      const onCountryChange = vi.fn();
      render(
        <ControlledHarness
          initialValue={initialValue}
          onCountryChange={onCountryChange}
          selectedCountry={country}
        />,
      );
      const locator = page.getByTestId('controlled-phone');
      await expect
        .element(locator)
        .toHaveValue(formatPhoneInputPresentation(initialValue).displayValue);
      const input = locator.element();

      if (!(input instanceof HTMLInputElement)) {
        throw new Error('Expected the native phone input.');
      }

      replaceCompleteInputValue(input, national);

      await expect
        .element(locator)
        .toHaveValue(formatPhoneInputPresentation(expected).displayValue);
      await expect
        .element(page.getByTestId('controlled-callback-count'))
        .toHaveTextContent('1');
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.reason).toBe('replacement');
      expect(details.value).toBe(expected);
      expect(details.validation).toMatchObject({
        accepted: true,
        isPossible: true,
        isValid: false,
        mode: 'possible',
        reason: 'possible',
        status: 'possible',
      });
      expect(details.numberingPlan.selectedCountry).toBe(expectedSelectedCountry);
      const inputCountryChanges = onCountryChange.mock.calls.filter(
        ([, change]) => change.reason === 'input',
      );
      expect(inputCountryChanges).toHaveLength(1);
      expect(inputCountryChanges[0]?.[0]).toBe(expectedResolvedCountry);
      expect(inputCountryChanges[0]?.[1].numberingPlan.selectedCountry).toBeNull();
    },
  );

  test('uses captured replacement evidence when the input event omits metadata', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(
      input,
      '2025550123',
      () => new Event('input', { bubbles: true }),
    );

    await expect.element(locator).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('replacement');
  });

  test('uses authoritative input fallback for national autofill without beforeinput', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    setNativeInputValue(input, '2025550123');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '2025550123',
        inputType: 'insertReplacementText',
      }),
    );

    await expect.element(locator).toHaveValue('+1 202 555 0123');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('replacement');
    expect(details.value).toBe('+12025550123');
  });

  test('keeps fragment-style predictive replacement distinct from full autofill fallback', async () => {
    render(<ControlledHarness initialValue="+37529" selectedCountry="BY" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+375 29');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    setNativeInputValue(input, '+375 29 555 55 55');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '5555555',
        inputType: 'insertReplacementText',
      }),
    );

    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+375295555555');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('replacement');
  });

  test('commits a complete national autofill from an empty controlled value', async () => {
    render(<ControlledHarness selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '2025550123');

    await expect.element(locator).toHaveValue('+1 202 555 0123');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.previousValue).toBeUndefined();
    expect(details.value).toBe('+12025550123');
  });

  test('commits a complete national autofill in uncontrolled mode', async () => {
    const onChange = vi.fn();
    const onCountryChange = vi.fn();
    const onCountrySelection = vi.fn();
    render(
      <MuiPhoneInput
        defaultCountry="US"
        defaultValue="+14155552671"
        onChange={onChange}
        onCountryChange={onCountryChange}
        onCountrySelection={onCountrySelection}
        slotProps={{ htmlInput: { 'data-testid': 'uncontrolled-autofill-phone' } }}
      />,
    );
    const locator = page.getByTestId('uncontrolled-autofill-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '2025550123');

    await expect.element(locator).toHaveValue('+1 202 555 0123');
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]?.[0]).toBe('+12025550123');
    expect(onChange.mock.calls[0]?.[1].reason).toBe('replacement');
    expect(
      onCountryChange.mock.calls.filter(([, change]) => change.reason === 'input'),
    ).toHaveLength(0);
    expect(onCountrySelection).not.toHaveBeenCalled();
  });

  test.each([
    ['80291234567', '+375291234567'],
    ['0291234567', '+375291234567'],
    ['8 (029) 123-45-67', '+375291234567'],
    ['٠٢٩١٢٣٤٥٦٧', '+375291234567'],
    ['۰۲۹۱۲۳۴۵۶۷', '+375291234567'],
    ['०२९१२३४५६७', '+375291234567'],
    ['０２９１２３４５６７', '+375291234567'],
  ] as const)(
    'commits complete Belarus national keyboard input %s in controlled mode',
    async (nationalInput, expected) => {
      render(<ControlledHarness selectedCountry="BY" />);
      const locator = page.getByTestId('controlled-phone');

      await userEvent.type(locator, nationalInput);

      await expect
        .element(locator)
        .toHaveValue(formatPhoneInputPresentation(expected).displayValue);
      await expect
        .element(page.getByTestId('controlled-value'))
        .toHaveTextContent(expected);
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.reason).toBe('input');
      expect(details.value).toBe(expected);
      expect(details.validation.accepted).toBe(true);
      expect(details.numberingPlan.resolvedCountry).toBe('BY');
    },
  );

  test.each([
    ['80291234567', '+375291234567'],
    ['0291234567', '+375291234567'],
    ['8 (029) 123-45-67', '+375291234567'],
    ['٠٢٩١٢٣٤٥٦٧', '+375291234567'],
    ['۰۲۹۱۲۳۴۵۶۷', '+375291234567'],
    ['०२९१२३४५६७', '+375291234567'],
    ['０２９１２３４５６７', '+375291234567'],
  ] as const)(
    'commits complete Belarus national paste %s in controlled mode',
    async (nationalInput, expected) => {
      render(<ControlledHarness selectedCountry="BY" />);

      await pasteText('controlled-phone', nationalInput);

      await expect
        .element(page.getByTestId('controlled-phone'))
        .toHaveValue(formatPhoneInputPresentation(expected).displayValue);
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.reason).toBe('paste');
      expect(details.value).toBe(expected);
      expect(details.validation.accepted).toBe(true);
      expect(details.numberingPlan.resolvedCountry).toBe('BY');
    },
  );

  test('commits complete Belarus national keyboard input in uncontrolled mode', async () => {
    render(<UncontrolledNationalHarness />);
    const locator = page.getByTestId('uncontrolled-national-phone');

    await userEvent.type(locator, '0291234567');

    await expect.element(locator).toHaveValue('+375 29 123 45 67');
    await expect
      .element(page.getByTestId('uncontrolled-national-value'))
      .toHaveTextContent('+375291234567');
    const details = JSON.parse(
      page.getByTestId('uncontrolled-national-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('input');
    expect(details.validation.accepted).toBe(true);
  });

  test('commits complete Belarus national paste in uncontrolled mode', async () => {
    render(<UncontrolledNationalHarness />);

    await pasteText('uncontrolled-national-phone', '8 (029) 123-45-67');

    await expect
      .element(page.getByTestId('uncontrolled-national-phone'))
      .toHaveValue('+375 29 123 45 67');
    const details = JSON.parse(
      page.getByTestId('uncontrolled-national-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('paste');
    expect(details.validation.accepted).toBe(true);
  });

  test.each(['02912', '029123'] as const)(
    'keeps Belarus national keyboard draft %s unaccepted until structurally valid',
    async (draft) => {
      render(<ControlledHarness selectedCountry="BY" />);
      const locator = page.getByTestId('controlled-phone');

      await userEvent.type(locator, draft);

      await expect.element(locator).toHaveValue(`+${draft}`);
      await expect
        .element(locator)
        .toHaveAttribute('data-phone-input-accepted', 'false');
      const details = JSON.parse(
        page.getByTestId('controlled-details').element().textContent ?? '',
      ) as PhoneInputChangeDetails;
      expect(details.value).toBe(`+${draft}`);
      expect(details.validation.accepted).toBe(false);
    },
  );

  test('preserves explicit international keyboard input under a Belarus selection', async () => {
    render(<ControlledHarness selectedCountry="BY" />);
    const locator = page.getByTestId('controlled-phone');

    await userEvent.type(locator, '+441481123456');

    await expect.element(locator).toHaveValue('+44 1481 123456');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.value).toBe('+441481123456');
    expect(details.validation.accepted).toBe(true);
  });

  test('reconciles a rejected controlled national autofill without a second callback', async () => {
    render(
      <ControlledHarness
        acceptChanges={false}
        initialValue="+14155552671"
        selectedCountry="US"
      />,
    );
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '2025550123');

    await expect.element(locator).toHaveValue('+1 415 555 2671');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.value).toBe('+12025550123');
    expect(details.reason).toBe('replacement');
  });

  test('does not reinterpret ordinary incremental digits as national autofill', async () => {
    render(<ControlledHarness initialValue="+1" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');

    await userEvent.type(locator, '202');

    await expect.element(locator).toHaveValue('+1 202');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('3');
  });

  test('does not reinterpret a selected range as complete national autofill', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceInputRange(input, '2025550123', 2, 5);
    await Promise.resolve();

    expect(input.value).not.toBe('+12025550123');
    expect(page.getByTestId('controlled-value').element().textContent).not.toBe(
      '+12025550123',
    );
  });

  test('does not reclassify a composing complete-field replacement as national autofill', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    input.focus();
    input.select();
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    input.dispatchEvent(
      new InputEvent('beforeinput', {
        bubbles: true,
        cancelable: true,
        data: '2025550123',
        inputType: 'insertReplacementText',
        isComposing: true,
      }),
    );
    setNativeInputValue(input, '2025550123');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '2025550123',
        inputType: 'insertReplacementText',
        isComposing: true,
      }),
    );

    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('0');

    input.dispatchEvent(
      new CompositionEvent('compositionend', {
        bubbles: true,
        data: '2025550123',
      }),
    );

    await expect.element(locator).toHaveValue('+20 2 5550123');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('composition');
    expect(details.value).toBe('+2025550123');
    expect(details.value).not.toBe('+12025550123');
  });

  test('does not infer a country for national replacement without a selection', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry={null} />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '2025550123');
    await Promise.resolve();

    expect(input.value).not.toBe('+12025550123');
    await expect.element(locator).toHaveAttribute('data-phone-input-country', '');
  });

  test('preserves an already international authoritative replacement', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    setNativeInputValue(input, '+442079460958');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '+442079460958',
        inputType: 'insertReplacementText',
      }),
    );

    await expect.element(locator).toHaveValue('+44 20 7946 0958');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.value).toBe('+442079460958');
    expect(details.reason).toBe('replacement');
  });

  test('does not fabricate a controlled number from an invalid national replacement', async () => {
    render(<ControlledHarness initialValue="+14155552671" selectedCountry="US" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '123');
    await Promise.resolve();

    await expect.element(locator).toHaveValue('+1 415 555 2671');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('0');
    await expect.element(locator).toHaveAttribute('data-phone-input-country', 'US');
  });

  test('uses caller metadata when classifying a complete national replacement', async () => {
    const customMetadata = structuredClone(rawMaxMetadata);
    const usMetadata = customMetadata.countries.US;
    if (!usMetadata) {
      throw new Error('Expected US metadata fixture.');
    }
    usMetadata[2] = '\\d{3}';
    usMetadata[3] = [3];
    const metadata = validatePhoneMetadata(customMetadata);
    render(
      <ControlledHarness
        initialValue="+14155552671"
        metadata={metadata}
        selectedCountry="US"
      />,
    );
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '123');

    await expect
      .element(page.getByTestId('controlled-value'))
      .toHaveTextContent('+1123');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
  });

  test('does not fabricate an uncontrolled number from an invalid national replacement', async () => {
    const onChange = vi.fn();
    render(
      <MuiPhoneInput
        defaultCountry="US"
        defaultValue="+14155552671"
        onChange={onChange}
        slotProps={{ htmlInput: { 'data-testid': 'uncontrolled-invalid-phone' } }}
      />,
    );
    const locator = page.getByTestId('uncontrolled-invalid-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '123');
    await Promise.resolve();

    await expect.element(locator).toHaveValue('+1 415 555 2671');
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(locator).toHaveAttribute('data-phone-input-country', 'US');
  });

  test('cancels a queued national autofill when the component unmounts', async () => {
    const onChange = vi.fn();
    const view = await render(
      <MuiPhoneInput
        onChange={onChange}
        selectedCountry="US"
        slotProps={{ htmlInput: { 'data-testid': 'unmount-autofill-phone' } }}
        value="+14155552671"
      />,
    );
    const locator = page.getByTestId('unmount-autofill-phone');
    await expect.element(locator).toHaveValue('+1 415 555 2671');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    replaceCompleteInputValue(input, '2025550123');
    await view.unmount();
    await Promise.resolve();

    expect(onChange).not.toHaveBeenCalled();
  });

  test('clears, focuses, and externally resets without duplicate callbacks', async () => {
    render(<ControlledHarness />);
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '12');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('2');

    await userEvent.click(page.getByRole('button', { name: 'Focus controlled phone' }));
    await expect.element(input).toHaveFocus();

    const inputElement = input.element();
    if (!(inputElement instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }
    inputElement.select();
    await userEvent.keyboard('{Backspace}');

    await expect.element(input).toHaveValue('');
    await expect.element(page.getByTestId('controlled-value')).toHaveTextContent('');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('3');

    await userEvent.type(input, '44');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('5');
    await userEvent.click(page.getByRole('button', { name: 'Reset controlled value' }));

    await expect.element(input).toHaveValue('');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('5');
  });

  test('owns uncontrolled state and restores the initial value on form reset', async () => {
    render(<UncontrolledHarness />);
    const input = page.getByTestId('uncontrolled-phone');

    await expect.element(input).toHaveValue('+1 202');
    await userEvent.type(input, '5');
    await expect.element(input).toHaveValue('+1 202 5');
    await expect
      .element(page.getByTestId('uncontrolled-value'))
      .toHaveTextContent('+12025');
    await expect
      .element(page.getByTestId('uncontrolled-callback-count'))
      .toHaveTextContent('1');

    await userEvent.click(
      page.getByRole('button', { name: 'Reset uncontrolled form' }),
    );

    await expect.element(input).toHaveValue('+1 202');
    await expect.element(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).not.toContain('Complete the phone number.');
    await expect
      .element(page.getByTestId('uncontrolled-callback-count'))
      .toHaveTextContent('1');
  });

  test('sanitizes invalid formatted paste and reports a paste transaction', async () => {
    render(<ControlledHarness />);

    await pasteText('controlled-phone', 'phone: +375 (29) 123-45-67');

    await expect
      .element(page.getByTestId('controlled-phone'))
      .toHaveValue('+375 29 123 45 67');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');

    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('paste');
    expect(details.value).toBe('+375291234567');
    expect(details.numberingPlan).toEqual({
      countryCallingCode: '375',
      detectedCountry: 'BY',
      kind: 'geographic',
      possibleCountries: ['BY'],
      resolvedCountry: 'BY',
      selectedCountry: null,
    });
  });

  test('keeps a selected shared-code country until digits detect another country', async () => {
    render(<ControlledHarness selectedCountry="CA" />);
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '1');
    await expect.element(input).toHaveAttribute('data-phone-input-country', 'CA');
    let details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.numberingPlan).toMatchObject({
      countryCallingCode: '1',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: expect.arrayContaining(['CA', 'US']),
      resolvedCountry: 'CA',
      selectedCountry: 'CA',
    });

    await userEvent.type(input, '2025550123');
    await expect.element(input).toHaveAttribute('data-phone-input-country', '');
    details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.numberingPlan).toMatchObject({
      countryCallingCode: '1',
      detectedCountry: 'US',
      kind: 'geographic',
      possibleCountries: ['US'],
      resolvedCountry: 'US',
      selectedCountry: null,
    });
  });

  test('preserves an explicit country through compatible authority narrowing', async () => {
    render(<ControlledHarness selectedCountry="US" />);
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '12015550');
    await expect.element(input).toHaveAttribute('data-phone-input-country', 'US');

    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.numberingPlan).toEqual({
      countryCallingCode: '1',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: ['CA', 'US'],
      resolvedCountry: 'US',
      selectedCountry: 'US',
    });
  });

  test('clears incompatible selection for a non-geographic plan', async () => {
    render(<ControlledHarness selectedCountry="US" />);
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '80012345678');
    await expect.element(input).toHaveAttribute('data-phone-input-country', '');

    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.numberingPlan).toEqual({
      countryCallingCode: '800',
      detectedCountry: null,
      kind: 'non-geographic',
      possibleCountries: [],
      resolvedCountry: null,
      selectedCountry: null,
    });
  });

  test('resolves an external controlled value without a callback loop', async () => {
    render(<ExternalNumberingHarness />);
    const input = page.getByTestId('external-numbering-phone');

    await expect.element(input).toHaveValue('+1');
    await userEvent.click(page.getByRole('button', { name: 'Set external US number' }));
    await expect.element(input).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('external-numbering-callback-count'))
      .toHaveTextContent('0');

    const inputElement = input.element();
    if (!(inputElement instanceof HTMLInputElement)) {
      throw new Error('Expected a native phone input.');
    }
    inputElement.focus();
    inputElement.setSelectionRange(
      inputElement.value.length - 1,
      inputElement.value.length,
    );
    await userEvent.keyboard('4');

    await expect
      .element(page.getByTestId('external-numbering-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('external-numbering-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.numberingPlan).toMatchObject({
      countryCallingCode: '1',
      detectedCountry: 'US',
      kind: 'geographic',
      possibleCountries: ['US'],
      resolvedCountry: 'US',
      selectedCountry: null,
    });
  });

  test('rejects an uncontrolled-to-controlled ownership switch after mount', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<OwnershipSwitchHarness />);
    const input = page.getByTestId('ownership-phone');

    await expect.element(input).toHaveValue('+1 202');
    await userEvent.click(page.getByRole('button', { name: 'Switch ownership' }));

    await expect.element(input).toHaveValue('+1 202');
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith(
      'MuiPhoneInput cannot switch between controlled and uncontrolled ownership after mount.',
    );
    consoleError.mockRestore();
  });

  test('does not leak a prevented paste reason into the next input transaction', async () => {
    render(<PreventedPasteHarness />);

    await pasteText('prevented-paste-phone', '+375291234567');
    await userEvent.type(page.getByTestId('prevented-paste-phone'), '1');

    const details = JSON.parse(
      page.getByTestId('prevented-paste-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('input');
    expect(details.value).toBe('+1');
  });

  test('consumes the paste reason on the first authoritative input', async () => {
    render(<ControlledHarness />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    const transfer = new DataTransfer();
    transfer.setData('text/plain', '+1');
    input.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
      }),
    );
    setNativeInputValue(input, '+1');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '+1',
        inputType: 'insertFromPaste',
      }),
    );
    setNativeInputValue(input, '+12');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '2',
        inputType: 'insertText',
      }),
    );

    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('input');
    expect(details.value).toBe('+12');
  });

  test('preserves a same-turn delete to the empty canonical value', async () => {
    render(<ControlledHarness initialValue="+1" />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toHaveValue('+1');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    setNativeInputValue(input, '+12');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '2',
        inputType: 'insertText',
      }),
    );
    setNativeInputValue(input, '');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: null,
        inputType: 'deleteContentBackward',
      }),
    );

    await expect.element(locator).toHaveValue('');
    await expect
      .element(page.getByTestId('controlled-callback-count'))
      .toHaveTextContent('1');
    const details = JSON.parse(
      page.getByTestId('controlled-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.reason).toBe('clear');
    expect(details.value).toBeUndefined();
  });

  test('cancels a queued input transaction when the component unmounts', async () => {
    const onChange = vi.fn();
    const view = await render(
      <MuiPhoneInput
        onChange={onChange}
        slotProps={{ htmlInput: { 'data-testid': 'unmount-input-phone' } }}
        value={undefined}
      />,
    );
    const locator = page.getByTestId('unmount-input-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    setNativeInputValue(input, '+12');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '12',
        inputType: 'insertText',
      }),
    );
    await view.unmount();
    await Promise.resolve();

    expect(onChange).not.toHaveBeenCalled();
  });

  test('cancels a queued form reset when the component unmounts', async () => {
    const onCountryChange = vi.fn();
    const view = await render(
      <form>
        <MuiPhoneInput
          defaultValue="+12025550123"
          onCountryChange={onCountryChange}
          slotProps={{ htmlInput: { 'data-testid': 'unmount-reset-phone' } }}
        />
      </form>,
    );
    const locator = page.getByTestId('unmount-reset-phone');
    await expect.element(locator).toHaveValue('+1 202 555 0123');
    const input = locator.element();

    if (!(input instanceof HTMLInputElement) || !input.form) {
      throw new Error('Expected a native phone input inside a form.');
    }

    await Promise.resolve();
    expect(onCountryChange).toHaveBeenCalledTimes(1);
    onCountryChange.mockClear();

    setNativeInputValue(input, '+375291234567');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '+375291234567',
        inputType: 'insertText',
      }),
    );
    await Promise.resolve();
    expect(onCountryChange).toHaveBeenCalledTimes(1);
    onCountryChange.mockClear();

    input.form.dispatchEvent(new Event('reset', { bubbles: true, cancelable: true }));
    await view.unmount();
    await Promise.resolve();

    expect(onCountryChange).not.toHaveBeenCalled();
  });

  test('cancels a queued paste transaction when the component unmounts', async () => {
    const onChange = vi.fn();
    const view = await render(
      <MuiPhoneInput
        onChange={onChange}
        slotProps={{ htmlInput: { 'data-testid': 'unmount-paste-phone' } }}
        value={undefined}
      />,
    );
    const locator = page.getByTestId('unmount-paste-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    const transfer = new DataTransfer();
    transfer.setData('text/plain', '+375291234567');
    input.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: transfer,
      }),
    );
    setNativeInputValue(input, '+375291234567');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '+375291234567',
        inputType: 'insertFromPaste',
      }),
    );
    await view.unmount();
    await Promise.resolve();
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    expect(onChange).not.toHaveBeenCalled();
  });

  test('keeps a new Strict Mode lifecycle independent from a canceled transaction', async () => {
    const onChange = vi.fn();
    const firstView = await render(
      <StrictMode>
        <MuiPhoneInput
          onChange={onChange}
          slotProps={{ htmlInput: { 'data-testid': 'strict-unmount-phone' } }}
          value={undefined}
        />
      </StrictMode>,
    );
    const firstLocator = page.getByTestId('strict-unmount-phone');
    await expect.element(firstLocator).toBeInTheDocument();
    const firstInput = firstLocator.element();

    if (!(firstInput instanceof HTMLInputElement)) {
      throw new Error('Expected the first Strict Mode phone input.');
    }

    setNativeInputValue(firstInput, '+12');
    firstInput.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '12',
        inputType: 'insertText',
      }),
    );
    await firstView.unmount();

    const secondView = await render(
      <StrictMode>
        <MuiPhoneInput
          onChange={onChange}
          slotProps={{ htmlInput: { 'data-testid': 'strict-remount-phone' } }}
          value={undefined}
        />
      </StrictMode>,
    );
    await Promise.resolve();
    expect(onChange).not.toHaveBeenCalled();

    const secondLocator = page.getByTestId('strict-remount-phone');
    await expect.element(secondLocator).toBeInTheDocument();
    const secondInput = secondLocator.element();
    if (!(secondInput instanceof HTMLInputElement)) {
      throw new Error('Expected the second Strict Mode phone input.');
    }

    setNativeInputValue(secondInput, '+375');
    secondInput.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '+375',
        inputType: 'insertText',
      }),
    );
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      '+375',
      expect.objectContaining({ reason: 'input', value: '+375' }),
    );
    await secondView.unmount();
  });

  test('cancels pending input work when composition is active during unmount', async () => {
    const onChange = vi.fn();
    const view = await render(
      <MuiPhoneInput
        onChange={onChange}
        slotProps={{ htmlInput: { 'data-testid': 'unmount-composition-phone' } }}
        value={undefined}
      />,
    );
    const locator = page.getByTestId('unmount-composition-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    setNativeInputValue(input, '+1');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '1',
        inputType: 'insertText',
      }),
    );
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    setNativeInputValue(input, '+12');
    input.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        data: '2',
        inputType: 'insertCompositionText',
        isComposing: true,
      }),
    );
    await view.unmount();
    await Promise.resolve();

    expect(onChange).not.toHaveBeenCalled();
  });

  test('accepts a transaction dispatched before passive lifecycle setup', async () => {
    const onChange = vi.fn();
    render(<LayoutEffectTransactionHarness onChange={onChange} />);
    await expect.element(page.getByTestId('layout-effect-phone')).toBeInTheDocument();
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      '+12',
      expect.objectContaining({ reason: 'input', value: '+12' }),
    );
  });

  test('applies MuiPhoneInput default props and root/input style overrides', async () => {
    const theme = createTheme({
      components: {
        MuiPhoneInput: {
          defaultProps: { fullWidth: true },
          styleOverrides: {
            input: { letterSpacing: '3px' },
            root: { minWidth: '321px' },
          },
        },
      },
    });

    render(
      <ThemeProvider theme={theme}>
        <MuiPhoneInput
          data-testid="themed-phone-root"
          slotProps={{ htmlInput: { 'data-testid': 'themed-phone-input' } }}
        />
      </ThemeProvider>,
    );

    const root = page.getByTestId('themed-phone-root');
    const input = page.getByTestId('themed-phone-input');
    await expect.element(root).toHaveClass('MuiFormControl-fullWidth');
    await expect.element(root).toHaveStyle({ minWidth: '321px' });
    await expect.element(input).toHaveClass('MuiPhoneInput-input');
    await expect.element(input).toHaveStyle({ letterSpacing: '3px' });
  });

  test('applies theme variants and prepares custom html input slots', async () => {
    const theme = createTheme({
      components: {
        MuiPhoneInput: {
          styleOverrides: {
            root: ({ ownerState }) => ({
              opacity:
                (ownerState as unknown as MuiPhoneInputOwnerState).validationStatus ===
                'empty'
                  ? 0.75
                  : 1,
            }),
          },
          variants: [
            {
              props: { required: true },
              style: { outline: '3px solid rgb(1, 2, 3)' },
            },
          ],
        },
      },
    });
    const inputRef = { current: null as HTMLInputElement | null };

    render(
      <ThemeProvider theme={theme}>
        <MuiPhoneInput
          ref={inputRef}
          required
          slots={{ htmlInput: CustomHtmlInput }}
          slotProps={{ htmlInput: { 'data-testid': 'custom-slot-input' } }}
          validationDisplay="always"
        />
      </ThemeProvider>,
    );

    const customInput = page.getByTestId('custom-slot-input');
    await expect.element(customInput).toBeInTheDocument();
    const root = customInput.element().closest('.MuiPhoneInput-root');
    if (!(root instanceof HTMLElement)) {
      throw new Error('Expected the MuiPhoneInput root.');
    }
    await expect.element(page.elementLocator(root)).toHaveStyle({
      opacity: '0.75',
      outline: 'rgb(1, 2, 3) solid 3px',
    });
    const input = customInput;
    await expect.element(input).toHaveAttribute('data-custom-phone-slot', 'true');
    await expect.element(input).toHaveClass('MuiPhoneInput-input');
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect.element(input).toHaveAttribute('data-phone-input-status', 'empty');
    await expect.element(input).toHaveAttribute('data-phone-input-accepted', 'false');
    await expect.element(input).toHaveAttribute('data-phone-input-plan', 'unresolved');
    const describedBy = input.element().getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const validationMessageElement = describedBy
      ? document.getElementById(describedBy)
      : null;
    expect(validationMessageElement).toBeInstanceOf(HTMLElement);
    expect(validationMessageElement).toHaveClass('MuiPhoneInput-validationMessage');
    expect(validationMessageElement).not.toHaveAttribute('aria-live');
    expect(inputRef.current).toBe(input.element());
    await userEvent.type(input, '375291234567');
    await expect.element(input).toHaveValue('+375 29 123 45 67');
    await expect.element(input).toHaveAttribute('aria-invalid', 'false');
    await expect.element(input).toHaveAttribute('data-phone-input-status', 'valid');
    await expect.element(input).toHaveAttribute('data-phone-input-accepted', 'true');
    await expect.element(input).toHaveAttribute('data-phone-input-plan', 'geographic');
    await expect.element(page.elementLocator(root)).toHaveStyle({ opacity: '1' });
  });

  test('protects controller-owned native props while composing safe slot customization', async () => {
    const componentRef = { current: null as HTMLInputElement | null };
    let slotInputRef: HTMLInputElement | null = null;
    let helperRef: HTMLParagraphElement | null = null;
    let consumerInputCount = 0;

    render(
      <>
        <span id="consumer-description">Consumer description</span>
        <MuiPhoneInput
          defaultValue="+1"
          id="owned-phone"
          label="Owned phone"
          ref={componentRef}
          required
          slots={{
            formHelperText: CustomFormHelperText,
            htmlInput: CustomHtmlInput,
          }}
          slotProps={{
            formHelperText: {
              className: 'consumer-helper-class',
              id: 'consumer-helper',
              ref: (element: HTMLParagraphElement | null) => {
                helperRef = element;
              },
            },
            htmlInput: {
              'aria-describedby':
                'consumer-description owned-phone-helper-text consumer-description',
              'aria-errormessage': 'consumer-error',
              'aria-invalid': false,
              className: 'consumer-input-class',
              'data-testid': 'owned-input',
              disabled: false,
              id: 'consumer-input',
              onInput: () => {
                consumerInputCount += 1;
              },
              readOnly: false,
              ref: (element: HTMLInputElement | null) => {
                slotInputRef = element;
              },
              required: false,
              value: '+44',
            },
          }}
          validationDisplay="always"
        />
      </>,
    );

    const input = page.getByTestId('owned-input');
    await expect.element(input).toBeInTheDocument();
    const helperElement = document.querySelector('[data-custom-helper-slot="true"]');
    if (!(helperElement instanceof HTMLParagraphElement)) {
      throw new Error('Expected the custom form-helper slot.');
    }
    const helper = page.elementLocator(helperElement);
    const label = document.querySelector('label[for="owned-phone"]');
    if (!(label instanceof HTMLLabelElement)) {
      throw new Error('Expected the owned phone label.');
    }

    await expect.element(input).toHaveValue('+1');
    await expect.element(input).toHaveAttribute('id', 'owned-phone');
    await expect.element(input).toHaveAttribute('required');
    await expect.element(input).not.toHaveAttribute('disabled');
    await expect.element(input).not.toHaveAttribute('readonly');
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(input)
      .toHaveAttribute('aria-errormessage', 'owned-phone-helper-text');
    expect(input.element().getAttribute('aria-describedby')?.split(/\s+/u)).toEqual([
      'consumer-description',
      'owned-phone-helper-text',
    ]);
    expect(label).toHaveAttribute('for', 'owned-phone');
    await expect.element(helper).toHaveAttribute('id', 'owned-phone-helper-text');
    await expect.element(helper).toHaveClass('consumer-helper-class');
    await expect.element(input).toHaveClass('consumer-input-class');
    await expect.element(input).toHaveAttribute('data-custom-phone-slot', 'true');
    await expect.element(helper).toHaveAttribute('data-custom-helper-slot', 'true');
    expect(componentRef.current).toBe(input.element());
    expect(slotInputRef).toBe(input.element());
    expect(helperRef).toBe(helper.element());

    await userEvent.type(input, '2');
    await expect.element(input).toHaveValue('+1 2');
    expect(consumerInputCount).toBe(1);

    const accessibility = await axe.run(document.body, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
      },
    });
    const violations = accessibility.violations.map((violation) => ({
      id: violation.id,
      targets: violation.nodes.map((node) => node.target),
    }));
    expect(violations, JSON.stringify(violations, null, 2)).toEqual([]);
  });

  test.each([
    { helperText: null, name: 'null' },
    { helperText: false, name: 'false' },
    { helperText: '', name: 'an empty string' },
    { helperText: 0, name: 'zero' },
  ])(
    'does not expose helper IDREFs when helperText is $name',
    async ({ helperText }) => {
      render(
        <>
          <span id="falsey-helper-description">Consumer description</span>
          <MuiPhoneInput
            helperText={helperText}
            id="falsey-helper-phone"
            required
            slotProps={{
              htmlInput: {
                'aria-describedby':
                  'falsey-helper-description falsey-helper-phone-helper-text',
                'data-testid': 'falsey-helper-input',
              },
            }}
            validationDisplay="always"
          />
        </>,
      );

      const input = page.getByTestId('falsey-helper-input');
      await expect.element(input).toHaveAttribute('aria-invalid', 'true');
      await expect
        .element(input)
        .toHaveAttribute('aria-describedby', 'falsey-helper-description');
      await expect.element(input).not.toHaveAttribute('aria-errormessage');
      expect(document.getElementById('falsey-helper-phone-helper-text')).toBeNull();
    },
  );

  test('composes observational htmlInput change and input handlers exactly once', async () => {
    const semanticChange = vi.fn();
    const nativeChange = vi.fn();
    const nativeInput = vi.fn();
    const nativeInputCapture = vi.fn();

    render(
      <MuiPhoneInput
        defaultValue="+1"
        onChange={semanticChange}
        slotProps={{
          htmlInput: {
            'data-testid': 'native-change-input',
            onChange: (event: ChangeEvent<HTMLInputElement>) => {
              nativeChange(event);
              event.preventDefault();
            },
            onInput: nativeInput,
            onInputCapture: nativeInputCapture,
          },
        }}
      />,
    );

    const input = page.getByTestId('native-change-input');
    await userEvent.type(input, '2');

    await expect.element(input).toHaveValue('+1 2');
    expect(nativeInputCapture).toHaveBeenCalledTimes(1);
    expect(nativeInput).toHaveBeenCalledTimes(1);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenLastCalledWith(
      '+12',
      expect.objectContaining({ reason: 'input', value: '+12' }),
    );
  });

  test('composes handlers from function-valued htmlInput slot props', async () => {
    const semanticChange = vi.fn();
    const nativeChange = vi.fn();
    const nativeInput = vi.fn();
    const slotPropsFactory = vi.fn((preparedOwnerState: unknown) => {
      const preparedInputProps = preparedOwnerState as Readonly<{ value?: string }>;

      return {
        'data-prepared-value': preparedInputProps.value ?? '',
        'data-testid': 'function-native-change-input',
        onChange: nativeChange,
        onInput: nativeInput,
      };
    });

    render(
      <MuiPhoneInput
        defaultValue="+1"
        id="function-handler-phone"
        onChange={semanticChange}
        slotProps={{ htmlInput: slotPropsFactory }}
      />,
    );

    const input = page.getByTestId('function-native-change-input');
    await expect.element(input).toHaveAttribute('data-prepared-value', '+1');
    await userEvent.type(input, '2');

    await expect.element(input).toHaveValue('+1 2');
    await expect.element(input).toHaveAttribute('data-prepared-value', '+1 2');
    expect(slotPropsFactory).toHaveBeenCalled();
    expect(nativeInput).toHaveBeenCalledTimes(1);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenCalledTimes(1);
  });

  test('composes paste and blur slot handlers without duplicating the transaction', async () => {
    const semanticChange = vi.fn();
    const nativeBlur = vi.fn();
    const nativeChange = vi.fn();
    const nativeInput = vi.fn();
    const nativeInputCapture = vi.fn();
    const nativePaste = vi.fn();

    render(
      <MuiPhoneInput
        defaultValue="+1"
        onChange={semanticChange}
        slotProps={{
          htmlInput: {
            'data-testid': 'native-paste-input',
            onBlur: nativeBlur,
            onChange: nativeChange,
            onInput: nativeInput,
            onInputCapture: nativeInputCapture,
            onPaste: nativePaste,
          },
        }}
      />,
    );

    const input = page.getByTestId('native-paste-input');
    await pasteText('native-paste-input', '+375291234567');
    input.element().blur();

    await expect.element(input).toHaveValue('+375 29 123 45 67');
    expect(nativePaste).toHaveBeenCalledTimes(1);
    expect(nativeInputCapture).toHaveBeenCalledTimes(1);
    expect(nativeInput).toHaveBeenCalledTimes(1);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(nativeBlur).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenLastCalledWith(
      '+375291234567',
      expect.objectContaining({ reason: 'paste', value: '+375291234567' }),
    );
  });

  test('composes composition slot handlers without duplicating the transaction', async () => {
    const semanticChange = vi.fn();
    const nativeChange = vi.fn();
    const nativeCompositionEnd = vi.fn();
    const nativeCompositionStart = vi.fn();
    const nativeInput = vi.fn();
    const nativeInputCapture = vi.fn();

    render(
      <MuiPhoneInput
        defaultValue="+375"
        onChange={semanticChange}
        slotProps={{
          htmlInput: {
            'data-testid': 'native-composition-input',
            onChange: nativeChange,
            onCompositionEnd: nativeCompositionEnd,
            onCompositionStart: nativeCompositionStart,
            onInput: nativeInput,
            onInputCapture: nativeInputCapture,
          },
        }}
      />,
    );

    const input = page.getByTestId('native-composition-input');
    await expect.element(input).toBeInTheDocument();
    const inputElement = input.element();
    if (!(inputElement instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    dispatchCompositionTransaction(inputElement, '+375١٢', '١٢', {
      after: 6,
      beforeStart: 4,
    });

    await expect.element(input).toHaveValue('+375 12');
    expect(nativeCompositionStart).toHaveBeenCalledTimes(1);
    expect(nativeInputCapture).toHaveBeenCalledTimes(1);
    expect(nativeInput).toHaveBeenCalledTimes(1);
    expect(nativeChange).toHaveBeenCalledTimes(1);
    expect(nativeCompositionEnd).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenCalledTimes(1);
    expect(semanticChange).toHaveBeenLastCalledWith(
      '+37512',
      expect.objectContaining({ reason: 'composition', value: '+37512' }),
    );
  });

  test('respects a prevented paste while calling the slot handler exactly once', async () => {
    const semanticChange = vi.fn();
    const nativePaste = vi.fn();

    render(
      <MuiPhoneInput
        defaultValue="+1"
        onChange={semanticChange}
        slotProps={{
          htmlInput: {
            'data-testid': 'prevented-native-paste-input',
            onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
              nativePaste(event);
              event.preventDefault();
            },
          },
        }}
      />,
    );

    const input = page.getByTestId('prevented-native-paste-input');
    await pasteText('prevented-native-paste-input', '+375291234567');

    await expect.element(input).toHaveValue('+1');
    expect(nativePaste).toHaveBeenCalledTimes(1);
    expect(semanticChange).not.toHaveBeenCalled();
  });

  test('protects controlled value and state props from function-valued slot overrides', async () => {
    const onChange = vi.fn();

    render(
      <MuiPhoneInput
        disabled
        id="controlled-owned-phone"
        label="Controlled owned phone"
        onChange={onChange}
        readOnly
        required
        slotProps={{
          formHelperText: () => ({ id: 'consumer-controlled-helper' }),
          htmlInput: () => ({
            'aria-invalid': false,
            'data-testid': 'controlled-owned-input',
            disabled: false,
            id: 'consumer-controlled-input',
            readOnly: false,
            required: false,
            value: '+44',
          }),
        }}
        validationDisplay="always"
        value="+1"
      />,
    );

    const input = page.getByTestId('controlled-owned-input');
    await expect.element(input).toHaveValue('+1');
    await expect.element(input).toHaveAttribute('id', 'controlled-owned-phone');
    await expect.element(input).toHaveAttribute('disabled');
    await expect.element(input).toHaveAttribute('readonly');
    await expect.element(input).toHaveAttribute('required');
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(input)
      .toHaveAttribute('aria-errormessage', 'controlled-owned-phone-helper-text');
    const helper = document.getElementById('controlled-owned-phone-helper-text');
    expect(helper).toBeInstanceOf(HTMLElement);
    expect(document.getElementById('consumer-controlled-helper')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  test('composes persistent MUI helper text with consumer descriptions', async () => {
    render(
      <>
        <span id="persistent-consumer-description">
          Persistent consumer description
        </span>
        <MuiPhoneInput
          helperText="Persistent phone help"
          id="persistent-helper-phone"
          label="Persistent helper phone"
          required
          slotProps={{
            formHelperText: { id: 'consumer-persistent-helper' },
            htmlInput: {
              'aria-describedby': 'persistent-consumer-description',
              'data-testid': 'persistent-helper-input',
            },
          }}
          validationDisplay="always"
        />
      </>,
    );

    const input = page.getByTestId('persistent-helper-input');
    await expect
      .element(input)
      .toHaveAttribute(
        'aria-describedby',
        'persistent-consumer-description persistent-helper-phone-helper-text',
      );
    await expect
      .element(input)
      .toHaveAttribute('aria-errormessage', 'persistent-helper-phone-helper-text');
    const helper = document.getElementById('persistent-helper-phone-helper-text');
    expect(helper).toHaveTextContent('Persistent phone help');
    expect(document.getElementById('consumer-persistent-helper')).toBeNull();
  });

  test('shows incomplete validation after blur and clears it on correction', async () => {
    render(<ValidationHarness required />);
    const input = page.getByTestId('validation-phone');

    await userEvent.type(input, '1');
    expect(input.element().getAttribute('aria-invalid')).not.toBe('true');
    expect(document.body.textContent).not.toContain('Complete the phone number.');

    input.element().blur();
    await expect.element(input).toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByText('Complete the phone number.')).toBeVisible();

    await userEvent.type(input, '2025550123');
    await expect.element(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).not.toContain('Complete the phone number.');

    const details = JSON.parse(
      page.getByTestId('validation-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.validation).toMatchObject({
      accepted: true,
      isPossible: true,
      isValid: true,
      mode: 'possible',
      numberType: 'FIXED_LINE_OR_MOBILE',
      reason: 'valid',
      status: 'valid',
    });
  });

  test('accepts a structurally possible number by default', async () => {
    render(<ValidationHarness validationDisplay="always" />);
    const input = page.getByTestId('validation-phone');

    await pasteText('validation-phone', '+441481123456');
    await expect.element(input).not.toHaveAttribute('aria-invalid', 'true');
    await expect
      .element(page.getByTestId('validation-details'))
      .toHaveTextContent('"status":"possible"');

    const details = JSON.parse(
      page.getByTestId('validation-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.validation).toMatchObject({
      accepted: true,
      isPossible: true,
      isValid: false,
      mode: 'possible',
      reason: 'possible',
      status: 'possible',
    });
  });

  test('makes strict validity and number-type rejection explicit', async () => {
    const { unmount } = await render(
      <ValidationHarness validationDisplay="always" validationMode="valid" />,
    );

    await pasteText('validation-phone', '+441481123456');
    await expect
      .element(page.getByTestId('validation-phone'))
      .toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByText('Enter a valid phone number.')).toBeVisible();
    let details = JSON.parse(
      page.getByTestId('validation-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.validation).toMatchObject({
      accepted: false,
      mode: 'valid',
      reason: 'strict-validity-required',
      status: 'possible',
    });

    await unmount();
    render(
      <ValidationHarness
        allowedNumberTypes={['FIXED_LINE']}
        validationDisplay="always"
        validationMessage="Use a fixed-line number."
        validationMode="possible-and-type"
      />,
    );
    await pasteText('validation-phone', '+375291234567');
    await expect
      .element(page.getByTestId('validation-phone'))
      .toHaveAttribute('aria-invalid', 'true');
    await expect.element(page.getByText('Use a fixed-line number.')).toBeVisible();
    details = JSON.parse(
      page.getByTestId('validation-details').element().textContent ?? '',
    ) as PhoneInputChangeDetails;
    expect(details.validation).toMatchObject({
      accepted: false,
      mode: 'possible-and-type',
      numberType: 'MOBILE',
      reason: 'disallowed-number-type',
      status: 'valid',
    });
  });

  test('can suppress internal validation presentation without hiding details', async () => {
    render(<ValidationHarness required validationDisplay="never" />);
    const input = page.getByTestId('validation-phone');

    await userEvent.type(input, '1');
    input.element().blur();
    await expect
      .element(page.getByTestId('validation-details'))
      .toHaveTextContent('"accepted":false');
    await expect.element(input).not.toHaveAttribute('aria-invalid', 'true');
    expect(document.body.textContent).not.toContain('Complete the phone number.');
  });

  test('changes display mode and mask without changing the controlled Phone Value', async () => {
    render(<FormattingModeHarness />);
    const input = page.getByTestId('formatting-phone');

    await expect.element(input).toHaveValue('+1 202 555 0123');
    const inputElement = input.element() as HTMLInputElement;
    inputElement.focus();
    inputElement.setSelectionRange(6, 6);
    const nationalButton = page.getByText('Use national display').element();
    if (!(nationalButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the national display button.');
    }
    nationalButton.click();
    await expect.element(input).toHaveValue('(202) 555-0123');
    expect(inputElement.selectionStart).toBe(4);
    const maskButton = page.getByText('Use display mask').element();
    if (!(maskButton instanceof HTMLButtonElement)) {
      throw new Error('Expected the display mask button.');
    }
    maskButton.click();
    await expect.element(input).toHaveValue('202.555.0123');
    expect(inputElement.selectionStart).toBe(3);
    await userEvent.click(page.getByText('Use French locale'));
    await expect.element(input).toHaveValue('202.555.0123');
    expect(inputElement.selectionStart).toBe(3);
    await userEvent.click(page.getByText('Use Canada country'));
    await expect.element(input).toHaveValue('202.555.0123');
    expect(inputElement.selectionStart).toBe(3);
  });

  test('edits national presentation while committing the canonical international Phone Value', async () => {
    render(<DisplayModeEditingHarness displayMode="national" />);
    const input = page.getByTestId('display-mode-editing-phone');

    await userEvent.type(input, '2025550123');
    await expect.element(input).toHaveValue('(202) 555-0123');
    await expect
      .element(page.getByTestId('display-mode-editing-value'))
      .toHaveTextContent('+12025550123');
  });

  test('locks the fixed calling-code prefix while committing only user-entered national digits', async () => {
    render(
      <DisplayModeEditingHarness displayMode="international-fixed-calling-code" />,
    );
    const input = page.getByTestId('display-mode-editing-phone');

    await expect.element(input).toHaveValue('+1 ');
    await userEvent.type(input, '2025550123');
    await expect.element(input).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('display-mode-editing-value'))
      .toHaveTextContent('+12025550123');

    const element = input.element() as HTMLInputElement;
    element.setSelectionRange(2, 2);
    await userEvent.keyboard('{Backspace}');
    await expect.element(input).toHaveValue('+1 202 555 0123');
    await expect
      .element(page.getByTestId('display-mode-editing-value'))
      .toHaveTextContent('+12025550123');
    expect(element.selectionStart).toBe(2);
  });
});
