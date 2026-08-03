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
const controllerSource = await readFile(
  'packages/mui-phone-input/src/usePhoneInput.ts',
  'utf8',
);
const primitivesSource = await readFile(
  'packages/mui-phone-input/src/PhoneInputPrimitives.tsx',
  'utf8',
);
const countrySelectorSource = await readFile(
  'packages/mui-phone-input/src/PhoneInputCountrySelector.tsx',
  'utf8',
);
const packedConsumersVerifier = await readFile(
  'scripts/verify-packed-consumers.mjs',
  'utf8',
);

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
assert.equal(packageManifest.dependencies['libphonenumber-js'], '1.13.10');
for (const virtualizationDependency of [
  '@tanstack/react-virtual',
  'react-virtualized',
  'react-window',
  'virtua',
]) {
  assert.equal(packageManifest.dependencies[virtualizationDependency], undefined);
  assert.equal(packageManifest.peerDependencies[virtualizationDependency], undefined);
}

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

for (const source of [controllerSource, primitivesSource]) {
  assert.doesNotMatch(source, /\.value\s*=/u);
  assert.doesNotMatch(source, /setSelectionRange\(/u);
}
assert.match(controllerSource, /export function usePhoneInput/u);
assert.match(primitivesSource, /export function PhoneInputProvider/u);
assert.match(primitivesSource, /export function PhoneInputInput/u);
assert.doesNotMatch(countrySelectorSource, /noSsr:\s*true/u);
assert.match(packedConsumersVerifier, /javaScriptEnabled:\s*false/u);
assert.match(packedConsumersVerifier, /server-render-probe\.mjs/u);
assert.match(packedConsumersVerifier, /hydration-marker/u);
assert.match(packedConsumersVerifier, /responsive-country-selector-trigger/u);
assert.match(packedConsumersVerifier, /production-dependency-policy\.json/u);
assert.match(packedConsumersVerifier, /audit['"],\s*['"]--prod/u);
assert.match(
  packedConsumersVerifier,
  /viewport:\s*\{\s*height:\s*844,\s*width:\s*390/u,
);
assert.match(
  packedConsumersVerifier,
  /Next\.js server HTML and hydrated phone states/u,
);

assert.match(ciWorkflow, /node-version:\s*24/u);
assert.match(ciWorkflow, /node-version:\s*26/u);
assert.match(ciWorkflow, /continue-on-error:\s*true/u);
assert.match(rootPackage.scripts['ci:pr'], /verify:production-dependencies/u);
assert.match(rootPackage.scripts['ci:forward'], /verify:production-dependencies/u);

console.log('Workspace contract verified.');
