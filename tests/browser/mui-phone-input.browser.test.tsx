import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import { type ClipboardEvent, StrictMode, useRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  type PhoneInputChangeDetails,
  type PhoneValidationMode,
  type PhoneValue,
} from '../../packages/mui-phone-input/src';

function ControlledHarness({
  selectedCountry,
}: Readonly<{ selectedCountry?: CountryCode }> = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<PhoneValue>();
  const [callbackCount, setCallbackCount] = useState(0);
  const [details, setDetails] = useState<PhoneInputChangeDetails>();

  return (
    <>
      <MuiPhoneInput
        label="Controlled phone"
        onChange={(nextValue, nextDetails) => {
          setValue(nextValue);
          setDetails(nextDetails);
          setCallbackCount((count) => count + 1);
        }}
        ref={inputRef}
        slotProps={{ htmlInput: { 'data-testid': 'controlled-phone' } }}
        value={value}
        {...(selectedCountry ? { selectedCountry } : {})}
      />
      <output data-testid="controlled-value">{value ?? ''}</output>
      <output data-testid="controlled-callback-count">{callbackCount}</output>
      <output data-testid="controlled-details">
        {details ? JSON.stringify(details) : ''}
      </output>
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

describe('MuiPhoneInput tracer', () => {
  test('commits Unicode digits only after composition ends', async () => {
    render(<ControlledHarness />);
    const locator = page.getByTestId('controlled-phone');
    await expect.element(locator).toBeInTheDocument();
    const input = locator.element();

    if (!(input instanceof HTMLInputElement)) {
      throw new Error('Expected the native phone input.');
    }

    const nativeValueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      'value',
    )?.set;
    if (!nativeValueSetter) {
      throw new Error('Missing native input value setter.');
    }

    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    nativeValueSetter.call(input, '+١٢٣');
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

    await expect.element(locator).toHaveValue('+123');
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

  test('controls a canonical incomplete Phone Value with serializable details', async () => {
    render(
      <StrictMode>
        <ControlledHarness />
      </StrictMode>,
    );
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '37529');

    await expect.element(input).toHaveValue('+37529');
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

    await expect.element(input).toHaveValue('+1202');
    await userEvent.type(input, '5');
    await expect.element(input).toHaveValue('+12025');
    await expect
      .element(page.getByTestId('uncontrolled-value'))
      .toHaveTextContent('+12025');
    await expect
      .element(page.getByTestId('uncontrolled-callback-count'))
      .toHaveTextContent('1');

    await userEvent.click(
      page.getByRole('button', { name: 'Reset uncontrolled form' }),
    );

    await expect.element(input).toHaveValue('+1202');
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
      .toHaveValue('+375291234567');
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

  test('clears incompatible selection for a non-geographic plan', async () => {
    render(<ControlledHarness selectedCountry="US" />);
    const input = page.getByTestId('controlled-phone');

    await userEvent.type(input, '80012345678');

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
    await expect.element(input).toHaveValue('+12025550123');
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

    await expect.element(input).toHaveValue('+1202');
    await userEvent.click(page.getByRole('button', { name: 'Switch ownership' }));

    await expect.element(input).toHaveValue('+1202');
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
});
