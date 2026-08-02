import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

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
    console.log(
      `${basename(destination)} verified with the ${supportMatrix} support matrix.`,
    );
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}
