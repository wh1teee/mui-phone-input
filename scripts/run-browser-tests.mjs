import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { createServer } from 'node:net';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserTestsRoot = join(repositoryRoot, 'tests/browser');
const vitestEntry = join(repositoryRoot, 'node_modules/vitest/vitest.mjs');

async function collectBrowserTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectBrowserTests(path)));
    } else if (entry.isFile() && entry.name.endsWith('.browser.test.tsx')) {
      files.push(path);
    }
  }

  return files;
}

function reserveAvailablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to reserve a TCP port for Browser Mode tests.'));
        return;
      }
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolvePort(address.port);
      });
    });
  });
}

const requestedFiles = process.argv.slice(2);
const files = (
  requestedFiles.length > 0
    ? requestedFiles.map((file) => resolve(repositoryRoot, file))
    : await collectBrowserTests(browserTestsRoot)
).sort();

if (files.length === 0) {
  throw new Error('No Browser Mode test files were found.');
}

const displayPaths = files.map((file) => {
  const displayPath = relative(repositoryRoot, file);
  if (!file.startsWith(`${browserTestsRoot}/`) || !file.endsWith('.browser.test.tsx')) {
    throw new Error(`Browser test is outside the supported suite: ${displayPath}`);
  }
  return displayPath;
});

console.log(`[browser-suite] ${files.length} serialized files`);
const browserPort = await reserveAvailablePort();
const vitestFilters = requestedFiles.length > 0 ? displayPaths : [];
const result = spawnSync(
  process.execPath,
  [
    vitestEntry,
    'run',
    '--config',
    'vitest.browser.config.ts',
    '--reporter=dot',
    ...vitestFilters,
  ],
  {
    cwd: repositoryRoot,
    env: { ...process.env, VITEST_BROWSER_PORT: String(browserPort) },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}
if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Browser Mode passed: ${files.length} serialized files.`);
