import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import '@wh1teee/mui-phone-input/flags.css';
import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import type { ReactNode } from 'react';

import './globals.css';
import { Providers } from './providers';

const configuredSiteUrl = process.env.NEXT_PUBLIC_DOCS_URL;

// Self-hosted at build time: no runtime request to a font CDN.
const sans = Geist({
  display: 'swap',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
});
const mono = Geist_Mono({
  display: 'swap',
  subsets: ['latin', 'cyrillic'],
  variable: '--font-mono',
});

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { color: '#ffffff', media: '(prefers-color-scheme: light)' },
    { color: '#0b1120', media: '(prefers-color-scheme: dark)' },
  ],
};

export const metadata: Metadata = {
  title: 'Phone Input — React, Material UI, Base UI and shadcn',
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
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <AppRouterCacheProvider>
          <Providers>{children}</Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
