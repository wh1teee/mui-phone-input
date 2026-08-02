import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import type { ReactNode } from 'react';

import { Providers } from './providers';

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
