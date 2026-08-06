import type { PhoneCountrySelectorMessages } from '../PhoneInputCountrySelector';

export interface PhoneInputLocale {
  locale: string;
  messages: Readonly<PhoneCountrySelectorMessages>;
}

