'use client';

import { Combobox } from '@base-ui/react/combobox';
import { DirectionProvider } from '@base-ui/react/direction-provider';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import type {
  CreatePhoneCountryOptionsParameters,
  PhoneCountryOption,
} from '../country-selector';
import type { PhoneCountrySelectorMessages } from '../country-selector-messages';
import type { PhoneCountryTriggerContent } from '../country-selector-trigger';
import type { UsePhoneInputReturn } from '../usePhoneInput';
import {
  CountryListBody,
  type PhoneCountryFlagOptions,
  PhoneCountryTrigger,
  resolveCountryMessages,
  useCountryComboboxModel,
} from './PhoneCountryParts';

export interface PhoneInputCountrySelectorClassNames {
  close?: string;
  empty?: string;
  flag?: string;
  group?: string;
  groupLabel?: string;
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
  flags?: PhoneCountryFlagOptions;
  messages?: Partial<PhoneCountrySelectorMessages>;
  phone: UsePhoneInputReturn;
  /** undefined uses the document body; null defers the popup until a scope mounts. */
  portalContainer?: Combobox.Portal.Props['container'];
  /** Maximum rendered options, with or without a query. Omit to list every country. */
  resultLimit?: number;
  /** Default `'auto'`: the ISO code, plus the calling code in national display mode. */
  triggerContent?: PhoneCountryTriggerContent;
  /** An `aria-label` here prefixes the accessible name; the selection is appended. */
  triggerProps?: Omit<Combobox.Trigger.Props, 'children' | 'disabled'>;
}

/**
 * The built-in anchored popover: `PhoneCountryTrigger` and the list body of
 * `PhoneCountryList` inside one Base UI Combobox. Base UI owns interaction;
 * the shared phone controller owns country changes.
 */
export function PhoneInputCountrySelector({
  classNames = {},
  dir,
  flags,
  messages: suppliedMessages,
  phone,
  portalContainer,
  resultLimit,
  triggerContent = 'auto',
  triggerProps,
  ...modelOptions
}: PhoneInputCountrySelectorProps): ReactNode {
  const messages = resolveCountryMessages(suppliedMessages);
  const [open, setOpen] = useState(false);
  const selectedFromPopup = useRef(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const model = useCountryComboboxModel({
    ...modelOptions,
    phone,
    ...(resultLimit === undefined ? {} : { resultLimit }),
  });
  const { disabled } = model;
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);
  const content = (
    <Combobox.Root<PhoneCountryOption>
      {...model.rootProps}
      modal
      onOpenChange={(next) => {
        if (next) {
          selectedFromPopup.current = false;
          model.resetQuery();
        }
        setOpen(next && !disabled);
      }}
      onValueChange={(option) => {
        if (!option || disabled) return;
        selectedFromPopup.current = true;
        phone.actions.selectCountry(option.country);
      }}
      open={open && !disabled}
    >
      <Combobox.Trigger
        {...triggerProps}
        className={triggerProps?.className ?? classNames.trigger}
        data-slot="phone-country-trigger"
        dir={dir}
        disabled={disabled}
        render={
          <PhoneCountryTrigger
            {...(flags === undefined ? {} : { flags })}
            {...(classNames.flag === undefined
              ? {}
              : { flagClassName: classNames.flag })}
            {...(modelOptions.locale === undefined
              ? {}
              : { locale: modelOptions.locale })}
            {...(modelOptions.resolveCountryName === undefined
              ? {}
              : { resolveCountryName: modelOptions.resolveCountryName })}
            messages={messages}
            phone={phone}
            triggerContent={triggerContent}
          />
        }
        type="button"
      />
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
              <CountryListBody
                classNames={classNames}
                flags={flags}
                hasPreferred={model.hasPreferred}
                listRef={listRef}
                messages={messages}
                searchRef={searchRef}
                searchRowEnd={
                  <button
                    aria-label={messages.close}
                    className={classNames.close}
                    data-slot="phone-country-close"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      fill="none"
                      height="14"
                      viewBox="0 0 14 14"
                      width="14"
                    >
                      <path
                        d="m3.5 3.5 7 7m0-7-7 7"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeWidth="1.5"
                      />
                    </svg>
                  </button>
                }
              />
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
