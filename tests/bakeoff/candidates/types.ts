import type { CountryCode } from 'libphonenumber-js/max';

import type { PhoneValue } from './shared';

export type InputEngineCandidateId = 'maskito' | 'adapted-input-format';

export type InputEngineCandidateProps = Readonly<{
  country?: CountryCode;
  fixedCallingCode?: boolean;
  onChange: (value: PhoneValue) => void;
  separator?: string;
  value: PhoneValue;
}>;
