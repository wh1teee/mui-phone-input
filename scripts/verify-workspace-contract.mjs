import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const rootPackage = await readJson('package.json');
const packageManifest = await readJson('packages/mui-phone-input/package.json');
const tsdownConfig = await readFile(
  'packages/mui-phone-input/tsdown.config.ts',
  'utf8',
);
const ciWorkflow = await readFile('.github/workflows/ci.yml', 'utf8');

assert.equal(rootPackage.private, true);
assert.match(rootPackage.packageManager, /^pnpm@11\./u);
assert.match(rootPackage.engines.node, /24/u);

assert.equal(packageManifest.name, '@whiteee/mui-phone-input');
assert.equal(packageManifest.type, 'module');
assert.equal(packageManifest.sideEffects, false);
assert.equal(packageManifest.peerDependencies.react, '^19.0.0');
assert.equal(packageManifest.peerDependencies['@mui/material'], '^9.0.0');
assert.equal(packageManifest.peerDependencies['@emotion/react'], '^11.14.0');
assert.equal(packageManifest.peerDependencies['@emotion/styled'], '^11.14.0');
assert.equal(packageManifest.dependencies['@maskito/core'], '5.3.1');
assert.equal(packageManifest.dependencies['@maskito/react'], '5.3.1');

for (const exportPath of [
  '.',
  './server',
  './react-hook-form',
  './zod',
  './metadata/max',
  './metadata/min',
  './metadata/mobile',
  './metadata/custom',
  './locales/en',
  './flags/local',
]) {
  assert.ok(packageManifest.exports[exportPath], `Missing export ${exportPath}`);
}

assert.match(tsdownConfig, /platform:\s*['"]browser['"]/u);
assert.match(tsdownConfig, /platform:\s*['"]neutral['"]/u);
assert.match(tsdownConfig, /Chrome117/u);
assert.match(tsdownConfig, /Firefox121/u);
assert.match(tsdownConfig, /Safari17/u);

assert.match(ciWorkflow, /node-version:\s*24/u);
assert.match(ciWorkflow, /node-version:\s*26/u);
assert.match(ciWorkflow, /continue-on-error:\s*true/u);

console.log('Workspace contract verified.');
