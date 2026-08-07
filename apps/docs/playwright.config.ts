import { defineConfig } from '@playwright/test';

const port = Number(process.env.DOCS_E2E_PORT);
if (!Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new Error('DOCS_E2E_PORT must be set to an available TCP port.');
}
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  use: {
    baseURL,
    browserName: 'chromium',
  },
  webServer: {
    command: `pnpm exec next start --port ${port}`,
    reuseExistingServer: false,
    timeout: 30_000,
    url: baseURL,
  },
});
