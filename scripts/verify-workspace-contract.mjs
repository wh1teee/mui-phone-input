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
const usePhoneInputSource = await readFile(
  'packages/mui-phone-input/src/usePhoneInput.ts',
  'utf8',
);
const clientIndexSource = await readFile(
  'packages/mui-phone-input/src/index.ts',
  'utf8',
);
const muiPhoneInputClassesSource = await readFile(
  'packages/mui-phone-input/src/MuiPhoneInput/muiPhoneInputClasses.ts',
  'utf8',
);
const packedConsumersVerifier = await readFile(
  'scripts/verify-packed-consumers.mjs',
  'utf8',
);
const packageArtifactSource = await readFile(
  'scripts/lib/package-artifact.mjs',
  'utf8',
);
const packageArtifactConcurrencyVerifier = await readFile(
  'scripts/verify-package-artifact-concurrency.mjs',
  'utf8',
);
const productionDependenciesVerifier = await readFile(
  'scripts/verify-production-dependencies.mjs',
  'utf8',
);
const publishedRuntimeVerifier = await readFile(
  'scripts/verify-published-runtime.mjs',
  'utf8',
);
const rootReadme = await readFile('README.md', 'utf8');
const packageReadme = await readFile('packages/mui-phone-input/README.md', 'utf8');
const contributingGuide = await readFile('CONTRIBUTING.md', 'utf8');
const publicIntakePattern =
  /github\.com\/wh1teee\/mui-phone-input\/discussions\/new\?category=q-a/u;

assert.equal(rootPackage.private, true);
assert.match(rootPackage.packageManager, /^pnpm@11\./u);
assert.match(rootPackage.engines.node, /24/u);

assert.equal(packageManifest.name, '@whiteee/mui-phone-input');
assert.equal(packageManifest.type, 'module');
assert.equal(packageManifest.sideEffects, false);
assert.equal(packageManifest.engines, undefined);
assert.equal(
  packageManifest.bugs.url,
  'https://github.com/wh1teee/mui-phone-input/discussions/new?category=q-a',
);
for (const publicDocument of [rootReadme, packageReadme, contributingGuide]) {
  assert.match(publicDocument, publicIntakePattern);
  assert.doesNotMatch(publicDocument, /github\.com\/wh1teee\/mui-phone-input\/issues/u);
}
assert.match(contributingGuide, /canonical Bead/u);
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
for (const semanticSlot of [
  'callingCode',
  'closeButton',
  'countryCode',
  'empty',
  'group',
  'groupLabel',
  'listbox',
  'option',
  'optionLabel',
  'popup',
  'searchInput',
  'trigger',
]) {
  assert.match(
    countrySelectorSource,
    new RegExp(`${semanticSlot}\\?: ElementType`, 'u'),
  );
}
for (const publicSelectorType of [
  'PhoneCountrySelectorGroupOwnerState',
  'PhoneCountrySelectorIndicatorOwnerState',
  'PhoneCountrySelectorOptionOwnerState',
  'PhoneCountrySelectorOwnerState',
  'PhoneCountrySelectorSlotProps',
  'PhoneCountrySelectorSlots',
]) {
  assert.match(clientIndexSource, new RegExp(`type ${publicSelectorType}`, 'u'));
}
for (const semanticClass of [
  'countrySelectorCallingCode',
  'countrySelectorCloseButton',
  'countrySelectorCountryCode',
  'countrySelectorOptionLabel',
]) {
  assert.match(muiPhoneInputClassesSource, new RegExp(semanticClass, 'u'));
}
assert.match(packageReadme, /The stable semantic slots are/u);
assert.match(packageReadme, /implementation details rather than public slots/u);
for (const internalBoundary of [
  'phone-input-derived-state',
  'use-phone-input-ownership',
  'use-phone-input-prop-getters',
  'use-phone-input-transactions',
  'use-phone-input-validation-visibility',
]) {
  assert.match(usePhoneInputSource, new RegExp(`./internal/${internalBoundary}`, 'u'));
}
assert.ok(
  usePhoneInputSource.split('\n').length <= 650,
  'usePhoneInput.ts must remain a public orchestration shell below 650 lines.',
);
assert.match(packedConsumersVerifier, /javaScriptEnabled:\s*false/u);
assert.match(packedConsumersVerifier, /server-render-probe\.mjs/u);
assert.match(packedConsumersVerifier, /hydration-marker/u);
assert.match(packedConsumersVerifier, /responsive-country-selector-trigger/u);
assert.match(packedConsumersVerifier, /data-packed-slot-country/u);
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
assert.match(rootPackage.scripts['ci:pr'], /verify:published-runtime/u);
assert.match(rootPackage.scripts['verify:published-runtime'], /expected-major=24/u);
assert.match(rootPackage.scripts['ci:pr'], /verify:package-concurrency/u);
assert.match(packageArtifactSource, /mkdtemp\(join\(artifactsDirectory, ['"]run-/u);
assert.doesNotMatch(packageArtifactSource, /rm\(artifactsDirectory/u);
assert.match(packageArtifactConcurrencyVerifier, /assert\.notEqual/u);
assert.match(packageArtifactConcurrencyVerifier, /siblingEvidencePath/u);
assert.match(productionDependenciesVerifier, /audit\.error/u);
assert.match(
  productionDependenciesVerifier,
  /auditResult\.status\s*===\s*0\s*\|\|\s*advisories\.length\s*>\s*0/u,
);
assert.match(publishedRuntimeVerifier, /engine-strict=true/u);
assert.match(publishedRuntimeVerifier, /@whiteee\/mui-phone-input\/server/u);
assert.match(publishedRuntimeVerifier, /--artifact=/u);
assert.match(ciWorkflow, /node-version:\s*22\.23\.1/u);
assert.match(ciWorkflow, /verify-published-runtime\.mjs\s+--expected-major=22/u);
assert.match(ciWorkflow, /published-runtime-artifact\.outputs\.tarball/u);

console.log('Workspace contract verified.');
