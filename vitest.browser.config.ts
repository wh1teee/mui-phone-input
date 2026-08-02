import react from '@vitejs/plugin-react';
import { playwright } from '@vitest/browser-playwright';
import { defineConfig } from 'vitest/config';

type BrowserName = 'chromium' | 'firefox' | 'webkit';

function resolveBrowser(value: string | undefined): BrowserName {
  const selected = value ?? 'chromium';

  switch (selected) {
    case 'chromium':
    case 'firefox':
    case 'webkit':
      return selected;
    default:
      throw new Error(`Unsupported VITEST_BROWSER: ${value}`);
  }
}

const browser = resolveBrowser(process.env.VITEST_BROWSER);

export default defineConfig({
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@maskito/core',
      '@maskito/react',
      '@mui/material/DefaultPropsProvider',
      '@mui/material/TextField',
      '@mui/material/generateUtilityClass',
      '@mui/material/generateUtilityClasses',
      '@mui/material/styles',
      '@mui/material/utils',
      'react',
      'react/jsx-runtime',
      'react-dom',
      'react-dom/client',
      'react-dom/server',
      'react-hook-form',
    ],
  },
  plugins: [react()],
  resolve: {
    dedupe: [
      '@emotion/react',
      '@emotion/styled',
      '@mui/material',
      '@mui/system',
      'react',
      'react-dom',
    ],
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [{ browser }],
      provider: playwright(),
    },
    include: ['tests/browser/**/*.browser.test.tsx'],
  },
});
