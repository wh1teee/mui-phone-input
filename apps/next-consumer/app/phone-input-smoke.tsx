'use client';

import {
  MuiPhoneInput,
  type PhoneInputChangeDetails,
  type PhoneValue,
} from '@whiteee/mui-phone-input';
import { useRef, useState } from 'react';

export function PhoneInputSmoke() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<PhoneValue>();
  const [callbackCount, setCallbackCount] = useState(0);
  const [details, setDetails] = useState<PhoneInputChangeDetails>();

  return (
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
  );
}
