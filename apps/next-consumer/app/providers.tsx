'use client';

import { createTheme, ThemeProvider } from '@mui/material/styles';
import type { ReactNode } from 'react';

const theme = createTheme({ cssVariables: true });

export function Providers({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
