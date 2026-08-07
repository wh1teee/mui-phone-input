import { createTheme, ThemeProvider } from '@mui/material/styles';
import {
  MuiPhoneInput,
  type PhoneCountryChangeDetails,
  type PhoneCountrySelectionResult,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneInputChangeDetails,
  type PhoneExtension,
  PhoneInputCountrySelector,
  PhoneInputInput,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  type PhoneValue,
  usePhoneInput,
} from '@wh1teee/mui-phone-input';
import '@wh1teee/mui-phone-input/flags.css';
import { MuiPhoneInputController } from '@wh1teee/mui-phone-input/react-hook-form';
import {
  parseNationalPhoneValue,
  resolveNumberingPlan,
} from '@wh1teee/mui-phone-input/server';
import { type ComponentPropsWithRef, StrictMode, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useForm, useWatch } from 'react-hook-form';

import { SsrStateMatrix } from './ssr-state-matrix';

const theme = createTheme({ cssVariables: true });
const root = document.querySelector('#root');
const serverPlan = resolveNumberingPlan('+80012345678');
const serverNationalPhone = parseNationalPhoneValue('80291234567', 'BY');

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

function PackedUnmountLifecycle() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [callbackCount, setCallbackCount] = useState(0);
  const [mounted, setMounted] = useState(true);

  return (
    <section>
      {mounted ? (
        <MuiPhoneInput
          onChange={() => setCallbackCount((count) => count + 1)}
          ref={inputRef}
          slotProps={{ htmlInput: { 'data-testid': 'packed-unmount-input' } }}
          value={undefined}
        />
      ) : null}
      <output data-testid="packed-unmount-callback-count">{callbackCount}</output>
      <button
        onClick={() => {
          const input = inputRef.current;
          const nativeValueSetter = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
          )?.set;
          if (!input || !nativeValueSetter) {
            throw new Error('Missing packed unmount input.');
          }

          nativeValueSetter.call(input, '+12');
          input.dispatchEvent(
            new InputEvent('input', {
              bubbles: true,
              data: '12',
              inputType: 'insertText',
            }),
          );
          setMounted(false);
        }}
        type="button"
      >
        Queue input and unmount
      </button>
    </section>
  );
}

function PackedNativeTabOrder() {
  const phone = usePhoneInput({ defaultCountry: 'BY' });

  return (
    <PhoneInputProvider value={phone}>
      <section>
        <div
          contentEditable
          data-testid="packed-tab-previous-editable"
          suppressContentEditableWarning
        >
          Previous editable
        </div>
        <PhoneInputCountrySelector data-testid="packed-tab-trigger" mode="desktop" />
        <PhoneInputInput data-testid="packed-tab-phone-input" tabIndex={-1} />
        <div
          contentEditable
          data-testid="packed-tab-next-editable"
          suppressContentEditableWarning
        >
          Next editable
        </div>
      </section>
    </PhoneInputProvider>
  );
}

function PackedOwnedSlotBoundary() {
  const [consumerInputCount, setConsumerInputCount] = useState(0);

  return (
    <section>
      <span id="packed-owned-description">Packed consumer description</span>
      <MuiPhoneInput
        defaultValue="+1"
        id="packed-owned-phone"
        label="Packed owned phone"
        required
        slotProps={{
          formHelperText: { id: 'packed-consumer-helper' },
          htmlInput: {
            'aria-describedby': 'packed-owned-description',
            'aria-errormessage': 'packed-consumer-error',
            'aria-invalid': false,
            'data-testid': 'packed-owned-input',
            id: 'packed-consumer-input',
            onInput: () => setConsumerInputCount((count) => count + 1),
            required: false,
            value: '+44',
          },
        }}
        validationDisplay="always"
      />
      <output data-testid="packed-owned-consumer-input-count">
        {consumerInputCount}
      </output>
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

function PackedPerformanceInput() {
  const [extension, setExtension] = useState<PhoneExtension>();
  const [masked, setMasked] = useState(false);
  const [value, setValue] = useState<PhoneValue>();

  return (
    <section>
      <MuiPhoneInput
        displayMask={masked ? { pattern: '+ # (###) ###-####' } : undefined}
        extension={extension}
        extensionPresentation="separate"
        label="Packed performance phone"
        onChange={setValue}
        onExtensionChange={setExtension}
        slotProps={{
          countrySelector: {
            'data-testid': 'performance-country-trigger',
            mode: 'desktop',
          },
          extension: { htmlInput: { 'data-testid': 'performance-extension' } },
          htmlInput: { 'data-testid': 'performance-input' },
        }}
        value={value}
      />
      <output data-testid="performance-value">{value ?? ''}</output>
      <output data-testid="performance-extension-value">{extension ?? ''}</output>
      <output data-testid="performance-mask-enabled">{String(masked)}</output>
      <button onClick={() => setMasked((current) => !current)} type="button">
        Toggle performance mask
      </button>
      <button
        onClick={() => {
          setExtension(undefined);
          setValue(undefined);
        }}
        type="button"
      >
        Reset performance input
      </button>
    </section>
  );
}

type PackedFormValues = {
  extension: PhoneExtension;
  phone: PhoneValue;
};

function PackedReactHookFormAdapter() {
  const { control } = useForm<PackedFormValues>({
    defaultValues: { extension: '42', phone: '+12025550123' },
  });
  const values = useWatch({ control });

  return (
    <section>
      <MuiPhoneInputController
        control={control}
        extensionLabel="Packed RHF extension"
        extensionName="extension"
        extensionPresentation="separate"
        label="Packed RHF phone"
        name="phone"
        slotProps={{
          extension: { htmlInput: { 'data-testid': 'packed-rhf-extension' } },
          htmlInput: { 'data-testid': 'packed-rhf-phone' },
        }}
      />
      <output data-testid="packed-rhf-values">{JSON.stringify(values)}</output>
    </section>
  );
}

createRoot(root).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <main>
        <h1>Packed Vite consumer</h1>
        <output data-testid="server-plan-matrix">
          {JSON.stringify({ kind: serverPlan.kind, national: serverNationalPhone })}
        </output>
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
        <PackedPerformanceInput />
        <PackedReactHookFormAdapter />
        <PackedOwnedSlotBoundary />
        <PackedUnmountLifecycle />
        <PackedNativeTabOrder />
        <PackedComposablePhoneInput />
        <SsrStateMatrix />
      </main>
    </ThemeProvider>
  </StrictMode>,
);
