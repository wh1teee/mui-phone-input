import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { brotliCompressSync, gzipSync } from 'node:zlib';
import { maskitoTransform } from '@maskito/core';
import { maskitoPhone } from '@maskito/phone';
import { chromium, firefox, webkit } from '@playwright/test';
import react from '@vitejs/plugin-react';
import { format, parse } from 'input-format';
import { AsYouType } from 'libphonenumber-js/max';
import { build } from 'vite';

const require = createRequire(import.meta.url);
const metadata = require('libphonenumber-js/metadata.max.json');
const repositoryRoot = resolve(import.meta.dirname, '..');
const resultPath = resolve(
  repositoryRoot,
  'docs/research/2026-08-02-input-engine-bakeoff-measurements.json',
);
const iterations = 20_000;
const samples = [
  '+375291234567',
  '+12025550123',
  '+442079460958',
  '+7 707 123 45 67',
  '+80012345678',
  '+١٢٠٢٥٥٥٠١٢٣',
];

const external = (id) =>
  id === 'react' ||
  id.startsWith('react/') ||
  id === 'react-dom' ||
  id.startsWith('react-dom/') ||
  id.startsWith('@mui/') ||
  id.startsWith('@emotion/') ||
  id.startsWith('libphonenumber-js');

async function bundleCandidate(entry) {
  const result = await build({
    configFile: false,
    logLevel: 'silent',
    plugins: [react()],
    build: {
      lib: {
        entry: resolve(repositoryRoot, entry),
        fileName: 'candidate',
        formats: ['es'],
      },
      minify: 'oxc',
      rollupOptions: { external },
      sourcemap: false,
      write: false,
    },
  });
  const outputs = (Array.isArray(result) ? result : [result]).flatMap(
    ({ output }) => output,
  );
  const code = outputs
    .filter(({ type }) => type === 'chunk')
    .map(({ code: chunkCode }) => chunkCode)
    .join('\n');

  return {
    brotliBytes: brotliCompressSync(code).byteLength,
    gzipBytes: gzipSync(code).byteLength,
    minifiedBytes: Buffer.byteLength(code),
  };
}

function parseCharacter(character, parsedValue) {
  if (/\d/u.test(character)) {
    return character;
  }

  if (character === '+' && parsedValue.length === 0) {
    return '+';
  }

  return undefined;
}

function adaptedFormatter(value = '') {
  const formatter = new AsYouType();
  const text = formatter.input(value);

  return {
    template: formatter.getTemplate() ?? '',
    text,
  };
}

const maskitoOptions = maskitoPhone({
  format: 'INTERNATIONAL',
  metadata,
  separator: ' ',
  strict: false,
});

function runMaskitoTransform(value) {
  return maskitoTransform(value, maskitoOptions);
}

function runAdaptedTransform(value) {
  const parsed = parse(value, undefined, parseCharacter);
  return format(parsed.value, parsed.caret, adaptedFormatter).text;
}

function measure(operation) {
  for (let warmup = 0; warmup < 3; warmup += 1) {
    for (const sample of samples) {
      operation(sample);
    }
  }

  const runs = [];
  for (let run = 0; run < 7; run += 1) {
    const startedAt = performance.now();

    for (let index = 0; index < iterations; index += 1) {
      operation(samples[index % samples.length]);
    }

    runs.push(performance.now() - startedAt);
  }

  runs.sort((left, right) => left - right);
  const medianMilliseconds = runs[Math.floor(runs.length / 2)];

  return {
    iterations,
    medianMilliseconds: Number(medianMilliseconds.toFixed(3)),
    operationsPerSecond: Math.round(iterations / (medianMilliseconds / 1_000)),
    runsMilliseconds: runs.map((value) => Number(value.toFixed(3))),
  };
}

async function browserVersions() {
  const versions = {};

  for (const [name, browserType] of Object.entries({
    chromium,
    firefox,
    webkit,
  })) {
    const browser = await browserType.launch({ headless: true });
    versions[name] = browser.version();
    await browser.close();
  }

  return versions;
}

async function sourceMetrics(path) {
  const source = await readFile(resolve(repositoryRoot, path), 'utf8');

  return {
    directDomMutationMatches: [
      ...(source.matchAll(/\.value\s*=/gu) ?? []),
      ...(source.matchAll(/setSelectionRange\(/gu) ?? []),
    ].length,
    lines: source.split('\n').length,
    sha256: createHash('sha256').update(source).digest('hex'),
  };
}

const [maskitoBundle, adaptedBundle, versions, maskitoSource, adaptedSource] =
  await Promise.all([
    bundleCandidate('tests/bakeoff/candidates/MaskitoCandidate.tsx'),
    bundleCandidate('tests/bakeoff/candidates/AdaptedInputFormatCandidate.tsx'),
    browserVersions(),
    sourceMetrics('tests/bakeoff/candidates/MaskitoCandidate.tsx'),
    sourceMetrics('tests/bakeoff/candidates/AdaptedInputFormatCandidate.tsx'),
  ]);

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  environment: {
    arch: process.arch,
    browsers: versions,
    node: process.version,
    platform: process.platform,
  },
  methodology: {
    bundle:
      'Vite 8 ESM library build; React, React DOM, MUI, Emotion, and libphonenumber-js are external so the result compares engine-specific candidate code.',
    performance:
      'Seven warm-process runs of 20,000 pure parse/format transformations; median reported. This is a deterministic signal, not a DOM-event latency claim.',
  },
  candidates: {
    maskito: {
      bundle: maskitoBundle,
      license: 'Apache-2.0 dependencies; local wrapper is MIT',
      packages: {
        '@maskito/core': '5.3.1',
        '@maskito/phone': '5.3.1 (bake-off helper, not selected authority)',
        '@maskito/react': '5.3.1',
      },
      performance: measure(runMaskitoTransform),
      source: maskitoSource,
    },
    'adapted-input-format': {
      bundle: adaptedBundle,
      license: 'MIT donor behavior requiring retained attribution if copied',
      packages: {
        'input-format': '0.3.14',
        'react-phone-number-input': '3.4.17 behavior inspected',
      },
      performance: measure(runAdaptedTransform),
      source: adaptedSource,
    },
  },
};

await writeFile(resultPath, `${JSON.stringify(report, null, 2)}\n`);
const formatResult = spawnSync(
  'pnpm',
  ['exec', 'biome', 'format', '--write', resultPath],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
);

if (formatResult.error) {
  throw formatResult.error;
}

if (formatResult.status !== 0) {
  throw new Error(
    `Biome failed to format measurement artifact: ${formatResult.stderr || formatResult.stdout}`,
  );
}

console.log(`Input-engine measurements written to ${resultPath}`);
