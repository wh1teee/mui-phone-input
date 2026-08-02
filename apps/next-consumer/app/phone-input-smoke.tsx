'use client';

import {
  MuiPhoneInput,
  type PhoneInputChangeDetails,
  PhoneInputInput,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  type PhoneValue,
  usePhoneInput,
} from '@whiteee/mui-phone-input';
import { useRef, useState } from 'react';

export function PhoneInputSmoke() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<PhoneValue>();
  const [callbackCount, setCallbackCount] = useState(0);
  const [details, setDetails] = useState<PhoneInputChangeDetails>();

  return (
    <>
      <section>
        <MuiPhoneInput
          fullWidth
          label="Phone number"
          onChange={(nextValue, nextDetails) => {
            setValue(nextValue);
            setDetails(nextDetails);
            setCallbackCount((count) => count + 1);
          }}
          ref={inputRef}
          slotProps={{ htmlInput: { 'data-testid': 'phone-input' } }}
          value={value}
        />
        <output data-testid="phone-value">{value ?? ''}</output>
        <output data-testid="callback-count">{callbackCount}</output>
        <output data-testid="change-details">
          {details ? JSON.stringify(details) : ''}
        </output>
        <button
          onClick={() => {
            inputRef.current?.focus();
          }}
          type="button"
        >
          Focus phone input
        </button>
        <button
          onClick={() => {
            setValue(undefined);
          }}
          type="button"
        >
          Reset phone input
        </button>
      </section>
      <PackedComposablePhoneInput />
    </>
  );
}

function PackedComposablePhoneInput() {
  const [callbackCount, setCallbackCount] = useState(0);
  const phone = usePhoneInput({
    defaultValue: '+1',
    onChange: () => setCallbackCount((count) => count + 1),
    required: true,
  });

  return (
    <PhoneInputProvider value={phone}>
      <section>
        <PhoneInputRoot data-testid="composable-root">
          <label htmlFor={phone.state.inputId}>Composable phone</label>
          <PhoneInputInput data-testid="composable-input" />
          <PhoneInputValidationMessage data-testid="composable-validation" />
        </PhoneInputRoot>
        <output data-testid="composable-value">{phone.state.value ?? ''}</output>
        <output data-testid="composable-callback-count">{callbackCount}</output>
        <output data-testid="composable-state">{JSON.stringify(phone.state)}</output>
        <button onClick={phone.actions.focus} type="button">
          Focus composable input
        </button>
        <button onClick={phone.actions.clear} type="button">
          Clear composable input
        </button>
        <button onClick={phone.actions.reset} type="button">
          Reset composable input
        </button>
      </section>
    </PhoneInputProvider>
  );
}
