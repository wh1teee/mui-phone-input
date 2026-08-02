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
    dedupe: ['react', 'react-dom'],
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
