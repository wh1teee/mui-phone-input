import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import '@wh1teee/mui-phone-input/flags.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'MUI Phone Input documentation',
  description:
    'Authoritative documentation, interactive playground, and migration guides for @wh1teee/mui-phone-input.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
