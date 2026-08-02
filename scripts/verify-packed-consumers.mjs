import { spawn } from 'node:child_process';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { chromium } from '@playwright/test';

import { createPackageArtifact, run } from './lib/package-artifact.mjs';

const supportMatrix = process.env.SUPPORT_MATRIX ?? 'latest';
const matrices = {
  latest: {
    '@emotion/react': '11.14.0',
    '@emotion/styled': '11.14.1',
    '@mui/material': '9.2.0',
    react: '19.2.8',
    'react-dom': '19.2.8',
  },
  minimum: {
    '@emotion/react': '11.14.0',
    '@emotion/styled': '11.14.1',
    '@mui/material': '9.0.0',
    react: '19.0.0',
    'react-dom': '19.0.0',
  },
};

if (!(supportMatrix in matrices)) {
  throw new Error(`Unknown SUPPORT_MATRIX: ${supportMatrix}`);
}

const tarball = await createPackageArtifact();
const temporaryRoot = await mkdtemp(join(tmpdir(), 'mui-phone-input-consumers-'));

async function reservePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();

      if (!address || typeof address === 'string') {
        server.close();
        reject(new Error('Unable to allocate a consumer verification port.'));
        return;
      }

      server.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve(address.port);
        }
      });
    });
  });
}

async function waitForServer(url, process, readLogs) {
  const deadline = Date.now() + 30_000;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      throw new Error(
        `Consumer server exited with status ${process.exitCode}.\n${readLogs()}`,
      );
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server startup is expected to refuse connections briefly.
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Consumer server did not become ready at ${url}.\n${readLogs()}`);
}

async function stopServer(process) {
  if (process.exitCode !== null) {
    return;
  }

  process.kill('SIGTERM');
  await Promise.race([
    new Promise((resolve) => process.once('exit', resolve)),
    new Promise((resolve) => setTimeout(resolve, 3_000)),
  ]);

  if (process.exitCode === null) {
    process.kill('SIGKILL');
  }
}

async function verifyPackedBrowser(destination, consumer) {
  const port = await reservePort();
  const url = `http://127.0.0.1:${port}`;
  const args =
    consumer === 'next-consumer'
      ? [
          '--dir',
          destination,
          'exec',
          'next',
          'start',
          '--hostname',
          '127.0.0.1',
          '--port',
          String(port),
        ]
      : [
          '--dir',
          destination,
          'exec',
          'vite',
          'preview',
          '--host',
          '127.0.0.1',
          '--port',
          String(port),
          '--strictPort',
        ];
  const serverProcess = spawn('pnpm', args, {
    cwd: destination,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  const captureLogs = (chunk) => {
    logs = `${logs}${chunk}`.slice(-16_000);
  };
  serverProcess.stdout.on('data', captureLogs);
  serverProcess.stderr.on('data', captureLogs);

  let browser;
  try {
    await waitForServer(url, serverProcess, () => logs);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error));

    await page.goto(url, { waitUntil: 'networkidle' });
    const input = page.getByTestId('phone-input');
    await input.pressSequentially('37529');
    await input.waitFor({ state: 'visible' });

    if ((await input.inputValue()) !== '+37529') {
      throw new Error(`Unexpected packed input value: ${await input.inputValue()}`);
    }
    if ((await page.getByTestId('phone-value').textContent()) !== '+37529') {
      throw new Error('Packed consumer did not expose the canonical Phone Value.');
    }
    if ((await page.getByTestId('callback-count').textContent()) !== '5') {
      throw new Error(
        'Packed consumer emitted an unexpected callback count after typing.',
      );
    }

    const details = JSON.parse(
      (await page.getByTestId('change-details').textContent()) || '{}',
    );
    if (
      details.value !== '+37529' ||
      details.previousValue !== '+3752' ||
      details.reason !== 'input' ||
      'nativeEvent' in details ||
      'target' in details
    ) {
      throw new Error(
        `Packed callback details are invalid: ${JSON.stringify(details)}`,
      );
    }

    await page.getByRole('button', { name: 'Focus phone input' }).click();
    if (!(await input.evaluate((element) => element === document.activeElement))) {
      throw new Error('Packed input ref did not focus the native input.');
    }

    await input.selectText();
    await input.press('Backspace');
    if ((await input.inputValue()) !== '') {
      throw new Error('Packed input did not clear to the empty state.');
    }
    if ((await page.getByTestId('callback-count').textContent()) !== '6') {
      throw new Error('Packed clear transaction did not emit exactly one callback.');
    }

    await input.pressSequentially('44');
    if ((await page.getByTestId('callback-count').textContent()) !== '8') {
      throw new Error('Packed input emitted duplicate callbacks under Strict Mode.');
    }
    await page.getByRole('button', { name: 'Reset phone input' }).click();
    if ((await input.inputValue()) !== '') {
      throw new Error('Packed external reset did not clear the display.');
    }
    if ((await page.getByTestId('callback-count').textContent()) !== '8') {
      throw new Error('Packed external reset emitted a callback loop.');
    }
    if (pageErrors.length > 0) {
      throw new Error(`Packed consumer page errors: ${pageErrors.join('\n')}`);
    }
  } finally {
    await browser?.close();
    await stopServer(serverProcess);
  }
}

try {
  const requestedConsumer = process.env.CONSUMER;
  const consumers = requestedConsumer
    ? [requestedConsumer]
    : ['next-consumer', 'vite-consumer'];

  for (const consumer of consumers) {
    if (!['next-consumer', 'vite-consumer'].includes(consumer)) {
      throw new Error(`Unknown CONSUMER: ${consumer}`);
    }
    const source = new URL(`../apps/${consumer}/`, import.meta.url);
    const destination = join(temporaryRoot, consumer);
    await cp(source, destination, { recursive: true });

    const packagePath = join(destination, 'package.json');
    const packageManifest = JSON.parse(await readFile(packagePath, 'utf8'));
    packageManifest.dependencies = {
      ...packageManifest.dependencies,
      ...matrices[supportMatrix],
      '@whiteee/mui-phone-input': `file:${tarball}`,
    };
    if (consumer === 'next-consumer') {
      Object.assign(
        packageManifest.dependencies,
        supportMatrix === 'minimum'
          ? {
              '@emotion/cache': '11.14.0',
              '@mui/material-nextjs': '9.0.0',
            }
          : {
              '@emotion/cache': '11.14.0',
              '@mui/material-nextjs': '9.1.1',
            },
      );
    }
    await writeFile(packagePath, `${JSON.stringify(packageManifest, null, 2)}\n`);
    await writeFile(
      join(destination, 'pnpm-workspace.yaml'),
      [
        'packages:',
        '  - .',
        '',
        'allowBuilds:',
        '  sharp: true',
        'autoInstallPeers: false',
        'minimumReleaseAge: 1440',
        'strictPeerDependencies: true',
        '',
      ].join('\n'),
    );

    run('pnpm', ['--dir', destination, 'install', '--frozen-lockfile=false']);
    run('pnpm', ['--dir', destination, 'build']);
    await verifyPackedBrowser(destination, consumer);
    console.log(
      `${basename(destination)} build and browser behavior verified with the ${supportMatrix} support matrix.`,
    );
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
