import type { PhoneCountrySearchAliases } from '../country-selector';
import type { PhoneCountrySelectorMessages } from '../country-selector-messages';

export interface PhoneInputLocale {
  locale: string;
  messages: Readonly<PhoneCountrySelectorMessages>;
  /** Extra search terms per country; pass them as `searchAliases`. */
  searchAliases?: PhoneCountrySearchAliases;
}
