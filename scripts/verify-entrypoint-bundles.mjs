import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, realpath, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

import { build } from 'vite';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);
const temporaryRoot = artifactArgument
  ? await mkdtemp(join(tmpdir(), 'mui-phone-input-bundles-'))
  : undefined;
const packageRoot = temporaryRoot
  ? join(temporaryRoot, 'package')
  : join(repositoryRoot, 'packages/mui-phone-input');
const budget = JSON.parse(
  await readFile(
    join(repositoryRoot, 'docs/research/2026-09-21-stable-entrypoint-budgets.json'),
    'utf8',
  ),
);

const rendererPeers = [
  '@base-ui/react',
  '@emotion/react',
  '@emotion/styled',
  '@mui/material',
  'react',
  'react-dom',
  'react-hook-form',
  'zod',
];
const bundledDependencies = [
  '@maskito/core',
  '@maskito/react',
  'libphonenumber-js',
  'tabbable',
];
const importPattern = /(?:import|export)\s+(?:[^'";]*?\s+from\s+)?["']([^"']+)["']/gu;

function isExternal(specifier) {
  return rendererPeers.some(
    (peer) => specifier === peer || specifier.startsWith(`${peer}/`),
  );
}

async function findInstalledDependency(dependency) {
  for (const candidate of [
    join(repositoryRoot, 'node_modules', dependency),
    join(repositoryRoot, 'packages/mui-phone-input/node_modules', dependency),
  ]) {
    try {
      return await realpath(candidate);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
  }
  throw new Error(`Installed dependency not found: ${dependency}`);
}

async function prepareArtifact() {
  if (!temporaryRoot || !artifactArgument) return;
  const artifact = resolve(
    repositoryRoot,
    artifactArgument.slice('--artifact='.length),
  );
  await mkdir(packageRoot, { recursive: true });
  execFileSync('tar', ['-xzf', artifact, '--strip-components=1', '-C', packageRoot]);
  for (const dependency of bundledDependencies) {
    const destination = join(packageRoot, 'node_modules', dependency);
    await mkdir(dirname(destination), { recursive: true });
    await symlink(await findInstalledDependency(dependency), destination, 'dir');
  }
}

async function collectExternalSpecifiers(entry) {
  const visited = new Set();
  const external = new Set();

  async function visit(filename) {
    const absolute = resolve(filename);
    if (visited.has(absolute)) return;
    visited.add(absolute);
    const source = await readFile(absolute, 'utf8');
    for (const match of source.matchAll(importPattern)) {
      const specifier = match[1];
      if (!specifier.startsWith('.')) {
        external.add(specifier);
        continue;
      }
      await visit(resolve(dirname(absolute), specifier));
    }
  }

  await visit(entry);
  return external;
}

function assertRendererClosure(profile, external) {
  const hasMui = [...external].some((value) => value.startsWith('@mui/material'));
  const hasBaseUi = [...external].some((value) => value.startsWith('@base-ui/react'));
  const hasReactHookForm = external.has('react-hook-form');
  switch (profile.renderer) {
    case 'mui':
      assert.equal(hasMui, true);
      assert.equal(hasBaseUi, false);
      assert.equal(hasReactHookForm, false);
      break;
    case 'mui-rhf':
      assert.equal(hasMui, true);
      assert.equal(hasBaseUi, false);
      assert.equal(hasReactHookForm, true);
      break;
    case 'base-ui':
      assert.equal(hasMui, false);
      assert.equal(hasBaseUi, true);
      assert.equal(hasReactHookForm, false);
      break;
    case 'base-ui-rhf':
      assert.equal(hasMui, false);
      assert.equal(hasBaseUi, true);
      assert.equal(hasReactHookForm, true);
      break;
    case 'headless':
      assert.equal(hasMui, false);
      assert.equal(hasBaseUi, false);
      assert.equal(hasReactHookForm, false);
      break;
    default:
      assert.fail(`Unknown renderer budget: ${profile.renderer}`);
  }
}

await prepareArtifact();
try {
  const measurements = [];
  for (const [entryName, profile] of Object.entries(budget.profiles)) {
    const entry = join(packageRoot, 'dist', `${entryName}.js`);
    const externalSpecifiers = await collectExternalSpecifiers(entry);
    assertRendererClosure(profile, externalSpecifiers);
    assert.equal(
      externalSpecifiers.has(`libphonenumber-js/metadata.${profile.metadata}.json`),
      true,
      `${entryName} must use metadata.${profile.metadata}.json`,
    );
    assert.equal(
      externalSpecifiers.has(
        `libphonenumber-js/metadata.${profile.metadata === 'max' ? 'min' : 'max'}.json`,
      ),
      false,
      `${entryName} includes both metadata variants`,
    );

    const result = await build({
      configFile: false,
      logLevel: 'silent',
      build: {
        codeSplitting: false,
        lib: { entry, formats: ['es'] },
        minify: 'oxc',
        rolldownOptions: { external: isExternal },
        sourcemap: false,
        write: false,
      },
    });
    const code = (Array.isArray(result) ? result : [result])
      .flatMap((output) => output.output ?? [])
      .filter((output) => output.type === 'chunk')
      .map((output) => output.code)
      .join('\n');
    const measurement = {
      entry: entryName,
      rawBytes: Buffer.byteLength(code),
      gzipBytes: gzipSync(code).byteLength,
      brotliBytes: brotliCompressSync(code).byteLength,
      sha256: createHash('sha256').update(code).digest('hex'),
    };
    assert(
      measurement.gzipBytes <= profile.gzipLimit,
      `${entryName} gzip ${measurement.gzipBytes} exceeds ${profile.gzipLimit}`,
    );
    assert(
      measurement.brotliBytes <= profile.brotliLimit,
      `${entryName} brotli ${measurement.brotliBytes} exceeds ${profile.brotliLimit}`,
    );
    measurements.push(measurement);
  }

  console.log(JSON.stringify({ verified: true, measurements }, null, 2));
} finally {
  if (temporaryRoot) await rm(temporaryRoot, { force: true, recursive: true });
}
