import { createTheme, ThemeProvider } from '@mui/material/styles';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { MuiPhoneInput, type PhoneFlagMode } from '../../packages/mui-phone-input/src';

const parameters = new URLSearchParams(window.location.search);
const mode = parameters.get('mode') === 'mobile' ? 'mobile' : 'desktop';
const rtl = parameters.get('rtl') === 'true';
const requestedFlagMode = parameters.get('flagMode');
const flagMode: PhoneFlagMode =
  requestedFlagMode === 'emoji' ||
  requestedFlagMode === 'none' ||
  requestedFlagMode === 'external'
    ? requestedFlagMode
    : 'local';
const theme = createTheme({ direction: rtl ? 'rtl' : 'ltr' });

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <main
        dir={rtl ? 'rtl' : 'ltr'}
        style={{ inlineSize: '100%', maxInlineSize: 640 }}
      >
        <button type="button">Before phone</button>
        <MuiPhoneInput
          defaultCountry="BY"
          label="Phone number"
          slotProps={{
            countrySelector: {
              flagMode,
              mode,
              preferredCountries: ['BY', 'DE', 'PL'],
              ...(flagMode === 'external'
                ? {
                    externalFlag: {
                      resolveUrl: (country: string) =>
                        `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><title>${country}</title><rect width="3" height="2" fill="currentColor"/></svg>`)}`,
                    },
                  }
                : {}),
            },
          }}
        />
        <button type="button">After phone</button>
      </main>
    </ThemeProvider>
  </StrictMode>,
);
