import '@whiteee/mui-phone-input/server';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  MuiPhoneInput,
  type PhoneInputChangeDetails,
  type PhoneValue,
} from '@whiteee/mui-phone-input';
import { StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

const theme = createTheme({ cssVariables: true });
const root = document.querySelector('#root');

if (!root) {
  throw new Error('Missing Vite consumer root element.');
}

function PackedPhoneInput() {
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

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <main>
        <h1>Packed Vite consumer</h1>
        <PackedPhoneInput />
      </main>
    </ThemeProvider>
  </StrictMode>,
);
