'use client';

import { CssBaseline, ThemeProvider } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { muiPhoneInputClasses } from '@wh1teee/mui-phone-input';
import type { ReactNode } from 'react';

const docsTheme = createTheme({
  cssVariables: true,
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
