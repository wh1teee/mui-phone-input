import type { PhoneCountrySelectorMessages } from '../country-selector-messages';

export interface PhoneInputLocale {
  locale: string;
  messages: Readonly<PhoneCountrySelectorMessages>;
}
