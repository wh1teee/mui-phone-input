'use client';

import { Combobox } from '@base-ui/react/combobox';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';

import {
  type CreatePhoneCountryOptionsParameters,
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
  type PhoneCountryOption,
} from '../country-selector';
import type { PhoneCountrySelectorMessages } from '../country-selector-messages';
import { PhoneCountryFlag, type PhoneCountryFlagProps } from '../flags';
import { en } from '../locales/en';
import type { UsePhoneInputReturn } from '../usePhoneInput';

export interface PhoneInputCountrySelectorClassNames {
  close?: string;
  empty?: string;
  flag?: string;
  list?: string;
  option?: string;
  popup?: string;
  positioner?: string;
  search?: string;
  trigger?: string;
}

export interface PhoneInputCountrySelectorProps
  extends Omit<CreatePhoneCountryOptionsParameters, 'metadata'> {
  classNames?: PhoneInputCountrySelectorClassNames;
  dir?: 'ltr' | 'rtl';
  flags?: Pick<PhoneCountryFlagProps, 'external' | 'mode' | 'provider'>;
  messages?: Partial<PhoneCountrySelectorMessages>;
  phone: UsePhoneInputReturn;
  /** undefined uses the document body; null defers the popup until a scope mounts. */
  portalContainer?: Combobox.Portal.Props['container'];
  triggerProps?: Omit<Combobox.Trigger.Props, 'children' | 'disabled'>;
}

/** Base UI owns interaction; the shared phone controller owns country changes. */
export function PhoneInputCountrySelector({
  classNames = {},
  countryFilter,
  countryOrder,
  dir,
  flags,
  locale = 'en',
  messages: suppliedMessages,
  phone,
  portalContainer,
  preferredCountries,
  resolveCountryName,
  triggerProps,
}: PhoneInputCountrySelectorProps): ReactNode {
  const messages = { ...en.messages, ...suppliedMessages };
  const [open, setOpen] = useState(false);
  const selectedFromPopup = useRef(false);
  const disabled = phone.state.disabled || phone.state.readOnly;
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const options = useMemo(
    () =>
      createPhoneCountryOptions({
        locale,
        metadata: phone.state.metadata,
        ...(countryFilter === undefined ? {} : { countryFilter }),
        ...(countryOrder === undefined ? {} : { countryOrder }),
        ...(preferredCountries === undefined ? {} : { preferredCountries }),
        ...(resolveCountryName === undefined ? {} : { resolveCountryName }),
      }),
    [
      countryFilter,
      countryOrder,
      locale,
      phone.state.metadata,
      preferredCountries,
      resolveCountryName,
    ],
  );
  const country =
    phone.state.selectedCountry ?? phone.state.numberingPlan.resolvedCountry;
  // A filter limits available choices, not the identity of an existing value.
  const selected = useMemo(
    () =>
      options.find((option) => option.country === country) ??
      (country
        ? (createPhoneCountryOptions({
            locale,
            metadata: phone.state.metadata,
            countryFilter: (code) => code === country,
            ...(resolveCountryName === undefined ? {} : { resolveCountryName }),
          })[0] ?? null)
        : null),
    [country, locale, options, phone.state.metadata, resolveCountryName],
  );
  const content = (
    <Combobox.Root<PhoneCountryOption>
      autoHighlight
      disabled={disabled}
      filter={(item, query) => filterPhoneCountryOptions([item], query).length > 0}
      isItemEqualToValue={(item, value) => item.country === value.country}
      itemToStringLabel={(item) => item.localizedName}
      itemToStringValue={(item) => item.country}
      items={options}
      modal
      onOpenChange={(next) => {
        if (next) selectedFromPopup.current = false;
        setOpen(next && !disabled);
      }}
      onValueChange={(option) => {
        if (!option || disabled) return;
        selectedFromPopup.current = true;
        phone.actions.selectCountry(option.country);
      }}
      open={open && !disabled}
      value={selected}
    >
      <Combobox.Trigger
        {...triggerProps}
        aria-label={triggerProps?.['aria-label'] ?? messages.selectCountry}
        className={triggerProps?.className ?? classNames.trigger}
        data-slot="phone-country-trigger"
        dir={dir}
        disabled={disabled}
        type="button"
      >
        {selected ? (
          <>
            <PhoneCountryFlag
              {...flags}
              className={classNames.flag}
              country={selected.country}
              mode={flags?.mode ?? 'none'}
              placement="trigger"
            />
            <span>{selected.country}</span>
          </>
        ) : (
          <span aria-hidden="true">+</span>
        )}
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="m3 4.5 3 3 3-3" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </Combobox.Trigger>
      {portalContainer !== null && (
        <Combobox.Portal container={portalContainer}>
          <Combobox.Positioner
            align="start"
            className={classNames.positioner}
            data-slot="phone-country-positioner"
            sideOffset={6}
          >
            <Combobox.Popup
              aria-label={messages.dialogTitle}
              className={classNames.popup}
              data-slot="phone-country-popup"
              dir={dir}
              finalFocus={() =>
                selectedFromPopup.current ? phone.inputElementRef.current : true
              }
            >
              <div data-slot="phone-country-search-row">
                <Combobox.Input
                  aria-label={messages.searchLabel}
                  autoComplete="off"
                  className={classNames.search}
                  data-slot="phone-country-search"
                  placeholder={messages.searchLabel}
                  type="search"
                />
                <button
                  aria-label={messages.close}
                  className={classNames.close}
                  data-slot="phone-country-close"
                  onClick={() => setOpen(false)}
                  type="button"
                >
                  <span aria-hidden="true">×</span>
                </button>
              </div>
              <Combobox.Empty
                className={classNames.empty}
                data-slot="phone-country-empty"
              >
                {messages.noOptions}
              </Combobox.Empty>
              <Combobox.List className={classNames.list} data-slot="phone-country-list">
                {(option: PhoneCountryOption) => (
                  <Combobox.Item
                    className={classNames.option}
                    data-preferred={option.preferred || undefined}
                    data-slot="phone-country-option"
                    key={option.country}
                    value={option}
                  >
                    <PhoneCountryFlag
                      {...flags}
                      className={classNames.flag}
                      country={option.country}
                      mode={flags?.mode ?? 'none'}
                      placement="option"
                    />
                    <span data-slot="phone-country-code">{option.country}</span>
                    <span data-slot="phone-country-name">{option.localizedName}</span>
                    <span data-slot="phone-country-calling-code" dir="ltr">
                      +{option.callingCode}
                    </span>
                    <Combobox.ItemIndicator data-slot="phone-country-indicator">
                      <span aria-hidden="true">✓</span>
                    </Combobox.ItemIndicator>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      )}
    </Combobox.Root>
  );
  return dir ? (
    <DirectionProvider direction={dir}>{content}</DirectionProvider>
  ) : (
    content
  );
}
