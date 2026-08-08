'use client';

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { MuiPhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input';
import { useState } from 'react';

export function LandingDemo() {
  const [value, setValue] = useState<PhoneValue>('+375291234567');

  return (
    <section className="landing-demo" aria-label="Live MUI Phone Input demo">
      <div className="landing-demo-header">
        <span className="landing-demo-dot" aria-hidden="true" />
        <span>Try it live</span>
      </div>
      <Stack spacing={2}>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Phone"
          value={value}
          onChange={setValue}
          validationDisplay="always"
          slotProps={{
            countrySelector: {
              'data-testid': 'landing-country-selector',
              mode: 'auto',
              preferredCountries: ['BY', 'PL', 'LT'],
            },
            htmlInput: { 'data-testid': 'landing-phone-input' },
          }}
        />
        <div className="landing-demo-value">
          <Typography component="span" variant="caption">
            Canonical value
          </Typography>
          <output data-testid="landing-phone-value">{value ?? 'undefined'}</output>
        </div>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
          <Button href="#quick-start" variant="contained">
            Get started
          </Button>
          <Button href="/playground" variant="outlined">
            Open playground
          </Button>
          <Button href="#phone-semantics" variant="text">
            Read phone semantics
          </Button>
        </Stack>
      </Stack>
    </section>
  );
}
