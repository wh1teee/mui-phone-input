import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import '@wh1teee/mui-phone-input/flags.css';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from './providers';

const configuredSiteUrl = process.env.NEXT_PUBLIC_DOCS_URL;

export const metadata: Metadata = {
  title: 'MUI Phone Input documentation',
  description:
    'Authoritative documentation, interactive playground, and migration guides for @wh1teee/mui-phone-input.',
  ...(configuredSiteUrl
    ? {
        alternates: { canonical: '/' },
        metadataBase: new URL(configuredSiteUrl),
        openGraph: {
          description:
            'Interactive documentation and API reference for @wh1teee/mui-phone-input.',
          title: 'MUI Phone Input documentation',
          type: 'website' as const,
          url: '/',
        },
      }
    : {}),
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
