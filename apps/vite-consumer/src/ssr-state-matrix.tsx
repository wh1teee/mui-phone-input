import {
  MuiPhoneInput,
  type MuiPhoneInputProps,
  type PhoneValue,
} from '@whiteee/mui-phone-input';
import { useEffect, useState } from 'react';

type SsrState = Readonly<{
  kind: string;
  placeholder: string;
  selectedCountry?: MuiPhoneInputProps['selectedCountry'];
  value: PhoneValue;
}>;

const SSR_STATES: readonly SsrState[] = [
  { kind: 'empty', placeholder: 'Empty phone', value: undefined },
  { kind: 'geographic', placeholder: 'Geographic phone', value: '+375291234567' },
  {
    kind: 'territory',
    placeholder: 'Territory phone',
    selectedCountry: 'AX',
    value: '+358412345678',
  },
  { kind: 'unresolved', placeholder: 'Unresolved phone', value: '+1' },
  {
    kind: 'non-geographic',
    placeholder: 'Non-geographic phone',
    value: '+80012345678',
  },
];

export function SsrStateMatrix() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => setHydrated(true), []);

  return (
    <section data-testid="ssr-state-matrix">
      <output data-testid="hydration-marker">{hydrated ? 'hydrated' : 'server'}</output>
      {SSR_STATES.map(({ kind, placeholder, selectedCountry, value }) => (
        <MuiPhoneInput
          data-testid={`ssr-${kind}-root`}
          id={`ssr-${kind}`}
          key={kind}
          label={`SSR ${kind}`}
          placeholder={placeholder}
          readOnly
          {...(selectedCountry === undefined ? {} : { selectedCountry })}
          slotProps={{
            countrySelector: {
              'data-testid': `ssr-${kind}-country`,
              disablePortal: true,
              locale: 'en',
              mode: 'desktop',
            },
            htmlInput: { 'data-testid': `ssr-${kind}-input` },
          }}
          value={value}
        />
      ))}
    </section>
  );
}
