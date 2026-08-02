import { createHash } from 'node:crypto';
import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { build } from 'vite';

import { createPackageArtifact, repositoryRoot } from './package-artifact.mjs';

const MAIN_GZIP_BUDGET_BYTES = 25 * 1024;
const SERVER_GZIP_BUDGET_BYTES = 10 * 1024;

const PEER_EXTERNALS = [
  '@emotion/react',
  '@emotion/styled',
  '@mui/material',
  'react',
  'react-dom',
  'react-hook-form',
  'zod',
];

function isPeerExternal(id) {
  return PEER_EXTERNALS.some((peer) => id === peer || id.startsWith(`${peer}/`));
}

function sizeRecord(content) {
  return {
    brotliBytes: brotliCompressSync(content).byteLength,
    gzipBytes: gzipSync(content).byteLength,
    rawBytes: Buffer.byteLength(content),
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

async function buildMainClosure() {
  const result = await build({
    build: {
      lib: {
        entry: resolve(repositoryRoot, 'packages/mui-phone-input/dist/index.js'),
        fileName: 'mui-phone-input',
        formats: ['es'],
      },
      minify: 'oxc',
      rollupOptions: {
        external: isPeerExternal,
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

export async function measureTracerPackage() {
  const tarball = await createPackageArtifact();
  const [mainClosure, serverCode, tarballStats] = await Promise.all([
    buildMainClosure(),
    readFile(
      resolve(repositoryRoot, 'packages/mui-phone-input/dist/server.js'),
      'utf8',
    ),
    stat(tarball),
  ]);
  const server = sizeRecord(serverCode);

  return {
    schemaVersion: 1,
    methodology: {
      main: 'Vite 8 Oxc-minified ESM closure of the packed main entry. Runtime dependencies are bundled; React, React DOM, MUI, Emotion, RHF and Zod peers are external.',
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
}
