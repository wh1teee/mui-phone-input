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
const browserPort = Number(process.env.VITEST_BROWSER_PORT ?? 63_315);
if (!Number.isInteger(browserPort) || browserPort < 1 || browserPort > 65_535) {
  throw new Error('VITEST_BROWSER_PORT must be set to an available TCP port.');
}

export default defineConfig({
  optimizeDeps: {
    include: [
      '@emotion/react',
      '@emotion/styled',
      '@maskito/core',
      '@maskito/react',
      '@mui/material/ButtonBase',
      '@mui/material/ClickAwayListener',
      '@mui/material/DefaultPropsProvider',
      '@mui/material/Dialog',
      '@mui/material/DialogContent',
      '@mui/material/DialogTitle',
      '@mui/material/Drawer',
      '@mui/material/InputAdornment',
      '@mui/material/Paper',
      '@mui/material/Popper',
      '@mui/material/TextField',
      '@mui/material/generateUtilityClass',
      '@mui/material/generateUtilityClasses',
      '@mui/material/styles',
      '@mui/material/useAutocomplete',
      '@mui/material/useMediaQuery',
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
      api: {
        host: '127.0.0.1',
        port: browserPort,
        strictPort: true,
      },
      enabled: true,
      // Focus-sensitive files share document.activeElement inside one browser instance.
      fileParallelism: false,
      headless: true,
      instances: [{ browser }],
      provider: playwright(),
    },
    include: ['tests/browser/**/*.browser.test.tsx'],
  },
});
