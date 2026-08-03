'use client';

import {
  MuiPhoneInput,
  type PhoneCountryChangeDetails,
  type PhoneCountrySelectionResult,
  type PhoneCountrySelectorOptionOwnerState,
  type PhoneInputChangeDetails,
  PhoneInputCountrySelector,
  PhoneInputInput,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  type PhoneValue,
  usePhoneInput,
} from '@whiteee/mui-phone-input';
import { type ComponentPropsWithRef, useRef, useState } from 'react';

import { SsrStateMatrix } from './ssr-state-matrix';

function PackedCountryOption({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorOptionOwnerState;
}) {
  return <li {...props} data-packed-slot-country={ownerState.option.country} />;
}

export function PhoneInputSmoke() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState<PhoneValue>();
  const [callbackCount, setCallbackCount] = useState(0);
  const [countryDetails, setCountryDetails] = useState<PhoneCountryChangeDetails>();
  const [countrySelection, setCountrySelection] =
    useState<PhoneCountrySelectionResult>();
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
      <section>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Responsive packed phone"
          slotProps={{
            countrySelector: {
              'data-testid': 'responsive-country-selector-trigger',
            },
          }}
        />
      </section>
      <PackedControlledInitialCountry />
      <PackedUnmountLifecycle />
      <PackedNativeTabOrder />
      <PackedComposablePhoneInput />
      <SsrStateMatrix />
    </>
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
