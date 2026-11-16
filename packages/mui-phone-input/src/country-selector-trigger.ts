import type { CountryCode } from 'libphonenumber-js/core';
import type { ReactNode } from 'react';

import type { PhoneCountryOption } from './country-selector';
import type { PhoneCountrySelectorMessages } from './country-selector-messages';
import { en } from './locales/en';
import type { PhoneInputDisplayMode } from './phone-formatting';

/** What the country trigger shows for the current selection. */
export interface PhoneCountryTriggerState {
  /** Calling-code digits without `+`, or `null` without a selected country. */
  callingCode: string | null;
  country: CountryCode | null;
  /** Localized country name, or `null` without a selected country. */
  countryName: string | null;
  displayMode: PhoneInputDisplayMode;
}

/**
 * Text drawn inside the country trigger. The flag (when enabled) and the
 * chevron are drawn by the trigger in every mode except a render function,
 * which replaces everything before the chevron.
 *
 * - `auto`: ISO code, plus the calling code in national display mode.
 * - `calling-code`: the calling code in national display mode; nothing in
 *   international modes, because the input already starts with it.
 * - `country-code`: the ISO code only.
 * - `both`: ISO code and calling code in every display mode.
 */
export type PhoneCountryTriggerContent =
  | 'auto'
  | 'both'
  | 'calling-code'
  | 'country-code'
  | ((state: PhoneCountryTriggerState) => ReactNode);

export interface PhoneCountryTriggerParts {
  callingCode: boolean;
  countryCode: boolean;
}

export function resolvePhoneCountryTriggerParts(
  content: Exclude<
    PhoneCountryTriggerContent,
    (state: PhoneCountryTriggerState) => ReactNode
  >,
  displayMode: PhoneInputDisplayMode,
): PhoneCountryTriggerParts {
  const national = displayMode === 'national';
  switch (content) {
    case 'both':
      return { callingCode: true, countryCode: true };
    case 'calling-code':
      return { callingCode: national, countryCode: false };
    case 'country-code':
      return { callingCode: false, countryCode: true };
    default:
      return { callingCode: national, countryCode: true };
  }
}

export function createPhoneCountryTriggerState(
  option: Readonly<PhoneCountryOption> | null,
  displayMode: PhoneInputDisplayMode,
): PhoneCountryTriggerState {
  return {
    callingCode: option?.callingCode ?? null,
    country: option?.country ?? null,
    countryName: option?.localizedName ?? null,
    displayMode,
  };
}

const TRIGGER_LABEL_PLACEHOLDER = /\{(label|countryName|country|callingCode)\}/gu;

/**
 * The trigger's accessible name: the label (a host `aria-label` or
 * `messages.selectCountry`) followed by the selection, whatever is drawn.
 */
export function formatPhoneCountryTriggerLabel(
  messages: Pick<PhoneCountrySelectorMessages, 'selectCountry' | 'triggerLabel'>,
  option: Readonly<PhoneCountryOption> | null,
  hostLabel?: string,
): string {
  const label = hostLabel?.trim() ? hostLabel : messages.selectCountry;
  if (!option) {
    return label;
  }
  const values = {
    callingCode: `+${option.callingCode}`,
    country: option.country,
    countryName: option.localizedName,
    label,
  };
  return (messages.triggerLabel ?? (en.messages.triggerLabel as string)).replace(
    TRIGGER_LABEL_PLACEHOLDER,
    (_match, key: keyof typeof values) => values[key],
  );
}
