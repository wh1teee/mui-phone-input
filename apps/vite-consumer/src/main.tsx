import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  MuiPhoneInput,
  type PhoneCountryChangeDetails,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneCountrySelectionResult,
  type PhoneInputChangeDetails,
  PhoneInputCountrySelector,
  PhoneInputInput,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  type PhoneValue,
  usePhoneInput,
} from '@whiteee/mui-phone-input';
import { resolveNumberingPlan } from '@whiteee/mui-phone-input/server';
import { type ComponentPropsWithRef, StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { SsrStateMatrix } from './ssr-state-matrix';

const theme = createTheme({ cssVariables: true });
const root = document.querySelector('#root');
const serverPlan = resolveNumberingPlan('+80012345678');

function PackedCountryOption({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorOptionOwnerState;
}) {
  return <li {...props} data-packed-slot-country={ownerState.option.country} />;
}

if (!root) {
  throw new Error('Missing Vite consumer root element.');
}

function PackedPhoneInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<PhoneValue>();
  const [callbackCount, setCallbackCount] = useState(0);
  const [countryDetails, setCountryDetails] = useState<PhoneCountryChangeDetails>();
  const [countrySelection, setCountrySelection] =
    useState<PhoneCountrySelectionResult>();
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
        onCountryChange={(_country, nextDetails) => setCountryDetails(nextDetails)}
        onCountrySelection={setCountrySelection}
        ref={inputRef}
        slotProps={{
          countrySelector: {
            'data-testid': 'country-selector-trigger',
            mode: 'desktop',
            preferredCountries: ['BY', 'US'],
            slotProps: {
              option: (ownerState) => ({
                'data-testid': `packed-country-option-${ownerState.option.country}`,
              }),
            },
            slots: { option: PackedCountryOption },
          },
          htmlInput: { 'data-testid': 'phone-input' },
        }}
        value={value}
      />
      <output data-testid="phone-value">{value ?? ''}</output>
      <output data-testid="callback-count">{callbackCount}</output>
      <output data-testid="change-details">
        {details ? JSON.stringify(details) : ''}
      </output>
      <output data-testid="country-change-details">
        {countryDetails ? JSON.stringify(countryDetails) : ''}
      </output>
      <output data-testid="country-selection-details">
        {countrySelection ? JSON.stringify(countrySelection) : ''}
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
      <button
        onClick={() => {
          setValue('+24740123');
        }}
        type="button"
      >
        Load impossible country source
      </button>
    </section>
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
          <PhoneInputCountrySelector
            data-testid="composable-country-trigger"
            mode="desktop"
            preferredCountries={['BY', 'US']}
          />
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

function PackedControlledInitialCountry() {
  const [events, setEvents] = useState<PhoneCountryChangeDetails[]>([]);

  return (
    <section>
      <MuiPhoneInput
        label="Controlled initial country"
        onCountryChange={(_country, details) =>
          setEvents((current) => [...current, details])
        }
        slotProps={{
          htmlInput: { 'data-testid': 'controlled-initial-country-input' },
        }}
        value="+375291234567"
      />
      <output data-testid="controlled-initial-country-events">
        {JSON.stringify(events)}
      </output>
    </section>
  );
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <main>
        <h1>Packed Vite consumer</h1>
        <output data-testid="server-plan-matrix">{serverPlan.kind}</output>
        <PackedPhoneInput />
        <MuiPhoneInput
          defaultCountry="BY"
          label="Responsive packed phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'responsive-country-selector-trigger',
            },
          }}
        />
        <PackedControlledInitialCountry />
        <PackedComposablePhoneInput />
        <SsrStateMatrix />
      </main>
    </ThemeProvider>
  </StrictMode>,
);
