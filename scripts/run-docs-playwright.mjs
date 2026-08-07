import { spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function reserveAvailablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Failed to reserve a TCP port for docs Playwright tests.'));
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

const port = await reserveAvailablePort();
const result = spawnSync(
  'pnpm',
  ['exec', 'playwright', 'test', ...process.argv.slice(2)],
  {
    cwd: join(repositoryRoot, 'apps/docs'),
    env: { ...process.env, DOCS_E2E_PORT: String(port) },
    stdio: 'inherit',
  },
);

if (result.error) {
  throw result.error;
}
process.exitCode = result.status ?? 1;
