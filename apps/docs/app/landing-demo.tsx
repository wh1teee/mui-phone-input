'use client';

import { MuiPhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input';
import {
  getPopularPhoneCountries,
  PhoneInput as ShadcnPhoneInput,
} from '@wh1teee/mui-phone-input/shadcn';
import '@wh1teee/mui-phone-input/shadcn.css';
import { useState } from 'react';

type Renderer = 'mui' | 'shadcn';

const preferredCountries = getPopularPhoneCountries(5);

export function LandingDemo() {
  const [renderer, setRenderer] = useState<Renderer>('mui');
  const [value, setValue] = useState<PhoneValue>('+12025550123');

  return (
    <section className="landing-demo" aria-label="Live phone input demo">
      <fieldset className="landing-demo-switch" data-active={renderer}>
        <legend className="docs-visually-hidden">Renderer</legend>
        {/* One thumb slides between options instead of two backgrounds swapping. */}
        <span aria-hidden="true" className="landing-demo-thumb" />
        {(
          [
            ['mui', 'Material UI'],
            ['shadcn', 'shadcn / Base UI'],
          ] as const
        ).map(([key, label]) => (
          <button
            aria-pressed={renderer === key}
            key={key}
            onClick={() => setRenderer(key)}
            type="button"
          >
            {label}
          </button>
        ))}
      </fieldset>
      <div className="landing-demo-field">
        {renderer === 'mui' ? (
          <MuiPhoneInput
            fullWidth
            label="Phone number"
            onChange={setValue}
            slotProps={{
              countrySelector: { preferredCountries },
              htmlInput: { 'data-testid': 'landing-phone-input' },
            }}
            value={value}
          />
        ) : (
          <ShadcnPhoneInput
            countrySelector={{ preferredCountries }}
            inputProps={{ 'data-testid': 'base-ui-phone-input' }}
            label="Phone number"
            onChange={setValue}
            value={value}
          />
        )}
      </div>
      <dl className="landing-demo-value">
        <dt>Stored value</dt>
        <dd>
          <output data-testid="landing-phone-value">{value ?? 'undefined'}</output>
        </dd>
      </dl>
      <p className="landing-demo-hint">
        Same engine, same value. Switch and keep typing.
      </p>
    </section>
  );
}
