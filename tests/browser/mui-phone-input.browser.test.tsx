import { createTheme, ThemeProvider } from '@mui/material/styles';
import { type ClipboardEvent, StrictMode, useRef, useState } from 'react';
import { describe, expect, test, vi } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
  MuiPhoneInput,
  type PhoneInputChangeDetails,
  type PhoneValue,
} from '../../packages/mui-phone-input/src';

function ControlledHarness() {
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

async function pasteText(inputTestId: string, text: string) {
  const source = document.createElement('textarea');
  source.value = text;
  document.body.append(source);
  source.focus();
  source.select();
  await userEvent.copy();
  source.remove();

  const input = page.getByTestId(inputTestId);
  await userEvent.click(input);
  await userEvent.paste();
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
      isPossible: null,
      isValid: null,
      numberType: null,
      reason: 'not-evaluated',
    });
    expect(details.numberingPlan).toEqual({
      countryCallingCode: null,
      kind: 'unresolved',
      possibleCountries: [],
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
});
