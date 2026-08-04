import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build } from 'vite';

import {
  createPackageArtifact,
  releasePackageArtifact,
  repositoryRoot,
} from './package-artifact.mjs';

const MAIN_GZIP_BUDGET_BYTES = 25 * 1024;
const SERVER_GZIP_BUDGET_BYTES = 10 * 1024;

const MAIN_BUDGET_EXTERNALS = [
  '@emotion/react',
  '@emotion/styled',
  '@mui/material',
  'libphonenumber-js',
  'react',
  'react-dom',
  'react-hook-form',
  'zod',
];

function isMainBudgetExternal(id) {
  return MAIN_BUDGET_EXTERNALS.some(
    (external) => id === external || id.startsWith(`${external}/`),
  );
}

function sizeRecord(content) {
  return {
    brotliBytes: brotliCompressSync(content).byteLength,
    gzipBytes: gzipSync(content).byteLength,
    rawBytes: Buffer.byteLength(content),
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

async function buildMainClosure(entry) {
  const result = await build({
    build: {
      lib: {
        entry,
        fileName: 'mui-phone-input',
        formats: ['es'],
      },
      minify: 'oxc',
      rollupOptions: {
        external: isMainBudgetExternal,
      },
      sourcemap: false,
      write: false,
    },
    configFile: false,
    logLevel: 'silent',
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    ({ output }) => output,
  );
  const code = outputs
    .filter(({ type }) => type === 'chunk')
    .map(({ code: chunkCode }) => chunkCode)
    .join('\n');

  return sizeRecord(code);
}

export async function measureTracerPackage(artifact) {
  const tarball = artifact ? resolve(artifact) : await createPackageArtifact();
  const extractionRoot = await mkdtemp(
    join(repositoryRoot, 'packages/mui-phone-input/.measure-'),
  );

  try {
    await readFile(tarball);
    execFileSync('tar', ['-xzf', tarball, '-C', extractionRoot], {
      cwd: repositoryRoot,
      stdio: 'ignore',
    });
    const packageRoot = join(extractionRoot, 'package');
    const [mainClosure, serverCode, tarballStats] = await Promise.all([
      buildMainClosure(join(packageRoot, 'dist/index.js')),
      readFile(join(packageRoot, 'dist/server.js'), 'utf8'),
      stat(tarball),
    ]);
    const server = sizeRecord(serverCode);

    return {
      schemaVersion: 1,
      methodology: {
        main: 'Vite 8 Oxc-minified ESM closure of the packed main entry. Maskito and tabbable runtime dependencies are bundled; React, React DOM, MUI, Emotion, RHF and Zod peers plus libphonenumber-js metadata are external because metadata has a separate budget.',
        server:
          'Direct tsdown neutral-platform server entry, excluding metadata presets.',
      },
      budgets: {
        mainGzipBytes: MAIN_GZIP_BUDGET_BYTES,
        serverGzipBytes: SERVER_GZIP_BUDGET_BYTES,
      },
      main: mainClosure,
      server,
      tarballBytes: tarballStats.size,
      status:
        mainClosure.gzipBytes <= MAIN_GZIP_BUDGET_BYTES &&
        server.gzipBytes <= SERVER_GZIP_BUDGET_BYTES
          ? 'pass'
          : 'fail',
    };
  } finally {
    await rm(extractionRoot, { force: true, recursive: true });
    if (!artifact) {
      await releasePackageArtifact(tarball);
    }
  }
}
