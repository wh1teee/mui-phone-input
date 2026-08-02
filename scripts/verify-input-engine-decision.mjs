import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const packageManifest = await readJson('packages/mui-phone-input/package.json');
const donorManifest = await readJson('donors/manifest.json');
const measurements = await readJson(
  'docs/research/2026-08-02-input-engine-bakeoff-measurements.json',
);
const selectedSource = await readFile(
  'tests/bakeoff/candidates/MaskitoCandidate.tsx',
  'utf8',
);
const adaptedSource = await readFile(
  'tests/bakeoff/candidates/AdaptedInputFormatCandidate.tsx',
  'utf8',
);
const contract = await readFile(
  'packages/mui-phone-input/src/internal/input-transaction-engine.ts',
  'utf8',
);
const adr = await readFile(
  'docs/adr/0006-select-maskito-as-the-input-transaction-engine.md',
  'utf8',
);
const mobileStatus = await readFile(
  'docs/research/2026-08-02-input-engine-real-mobile-status.md',
  'utf8',
);
const notices = await readFile(
  'packages/mui-phone-input/THIRD_PARTY_NOTICES.md',
  'utf8',
);
const sha256 = (source) => createHash('sha256').update(source).digest('hex');
const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);

assert.equal(packageManifest.dependencies['@maskito/core'], '5.3.1');
assert.equal(packageManifest.dependencies['@maskito/react'], '5.3.1');
assert.equal(donorManifest.inputEngineDecision.selected, 'maskito');
assert.equal(donorManifest.inputEngineDecision.contractVersion, 1);
assert.deepEqual(donorManifest.inputEngineDecision.runtimePackages, [
  '@maskito/core@5.3.1',
  '@maskito/react@5.3.1',
]);

assert.match(contract, /INPUT_TRANSACTION_ENGINE_CONTRACT_VERSION = 1/u);
assert.match(contract, /SELECTED_INPUT_TRANSACTION_ENGINE = 'maskito'/u);
assert.doesNotMatch(selectedSource, /\.value\s*=/u);
assert.doesNotMatch(selectedSource, /setSelectionRange\(/u);
assert.match(adaptedSource, /\.value\s*=/u);
assert.match(adaptedSource, /setSelectionRange\(/u);

assert.ok(measurements.candidates.maskito.bundle.brotliBytes > 0);
assert.ok(measurements.candidates['adapted-input-format'].bundle.brotliBytes > 0);
assert.equal(measurements.candidates.maskito.source.directDomMutationMatches, 0);
assert.equal(measurements.candidates.maskito.source.sha256, sha256(selectedSource));
assert.ok(
  measurements.candidates['adapted-input-format'].source.directDomMutationMatches > 0,
);
assert.equal(
  measurements.candidates['adapted-input-format'].source.sha256,
  sha256(adaptedSource),
);
assert.deepEqual(Object.keys(measurements.environment.browsers).sort(), [
  'chromium',
  'firefox',
  'webkit',
]);

assert.match(adr, /Select \*\*Maskito core\/React 5\.3\.1\*\*/u);
assert.match(mobileStatus, /deferred-to-mpi-oan\.24/u);
assert.match(notices, /Apache License, Version 2\.0/u);

for (const version of Object.values(measurements.environment.browsers)) {
  const versionPattern = new RegExp(version.replaceAll('.', '\\.'), 'u');
  assert.match(adr, versionPattern);
  assert.match(mobileStatus, versionPattern);
}

for (const candidate of ['maskito', 'adapted-input-format']) {
  const result = measurements.candidates[candidate];

  for (const value of [
    result.bundle.minifiedBytes,
    result.bundle.gzipBytes,
    result.bundle.brotliBytes,
    result.performance.operationsPerSecond,
    result.source.lines,
    result.source.directDomMutationMatches,
  ]) {
    assert.match(adr, new RegExp(formatNumber(value), 'u'));
  }
}

console.log('Input-engine decision verified.');
