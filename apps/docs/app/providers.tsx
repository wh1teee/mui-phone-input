'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { muiPhoneInputClasses } from '@wh1teee/mui-phone-input';
import type { ReactNode } from 'react';

const docsTheme = createTheme({
  // Follow the operating-system preference; the CSS tokens do the same.
  // Surfaces match the docs CSS tokens so MUI and hand-styled regions agree.
  colorSchemes: {
    dark: { palette: { background: { default: '#0b1120', paper: '#131c2e' } } },
    light: { palette: { background: { default: '#ffffff', paper: '#ffffff' } } },
  },
  cssVariables: { colorSchemeSelector: 'media' },
  typography: {
    fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
  },
  components: {
    MuiPhoneInput: {
      defaultProps: {
        validationDisplay: 'blur',
      },
      styleOverrides: {
        root: {
          variants: [
            {
              props: { size: 'small' },
              style: {
                [`& .${muiPhoneInputClasses.input}`]: {
                  fontVariantNumeric: 'tabular-nums',
                },
              },
            },
          ],
        },
      },
    },
  },
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={docsTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
