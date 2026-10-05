'use client';

import {
  getPopularPhoneCountries,
  PhoneInput,
  type PhoneValue,
} from '@wh1teee/mui-phone-input/shadcn';
import '@wh1teee/mui-phone-input/shadcn.css';
import { useState } from 'react';

const popularCountries = getPopularPhoneCountries(5);

export function BaseUiDemo() {
  const [value, setValue] = useState<PhoneValue>();

  return (
    <section className="base-ui-demo" aria-label="Live Base UI and shadcn demo">
      <PhoneInput
        countrySelector={{ preferredCountries: popularCountries }}
        defaultCountry="US"
        helperText="shadcn skin over the Base UI field"
        inputProps={{ 'data-testid': 'base-ui-phone-input' }}
        label="Phone"
        onChange={setValue}
        value={value}
      />
      <output data-testid="base-ui-phone-value">{value ?? 'undefined'}</output>
    </section>
  );
}
