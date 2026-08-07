import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL: 'http://127.0.0.1:3127',
    browserName: 'chromium',
  },
  webServer: {
    command: 'pnpm exec next start --port 3127',
    reuseExistingServer: false,
    timeout: 30_000,
    url: 'http://127.0.0.1:3127',
  },
});
