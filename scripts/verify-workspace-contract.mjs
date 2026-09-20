import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const rootPackage = await readJson('package.json');
const packageManifest = await readJson('packages/mui-phone-input/package.json');
const pnpmWorkspace = await readFile('pnpm-workspace.yaml', 'utf8');
const docsGvsRunner = await readFile('scripts/run-docs-gvs.mjs', 'utf8');
const docsGvsTopology = await readFile('scripts/lib/docs-gvs-topology.mjs', 'utf8');
const pnpmStoreTopology = await readFile('scripts/lib/pnpm-store-topology.mjs', 'utf8');
const childProcessTreeSource = await readFile(
  'scripts/lib/child-process-tree.mjs',
  'utf8',
);
const nextConsumerConfig = await readFile('apps/next-consumer/next.config.ts', 'utf8');
const nextConsumerTurbopackRoot = await readFile(
  'apps/next-consumer/turbopack-root.ts',
  'utf8',
);
const docsNextConfig = await readFile('apps/docs/next.config.ts', 'utf8');
const docsTurbopackRoot = await readFile('apps/docs/turbopack-root.ts', 'utf8');
const docsGvsPolicy = await readFile('docs/release/work-pc-shared-gvs.md', 'utf8');
const tsdownConfig = await readFile(
  'packages/mui-phone-input/tsdown.config.ts',
  'utf8',
);
const ciWorkflow = await readFile('.github/workflows/ci.yml', 'utf8');
const releaseWorkflow = await readFile('.github/workflows/release.yml', 'utf8');
const pnpmWorkflowSources = await Promise.all(
  [
    '.github/workflows/ci.yml',
    '.github/workflows/compatibility.yml',
    '.github/workflows/browser-matrix.yml',
    '.github/workflows/metadata-freshness.yml',
    '.github/workflows/release.yml',
  ].map((path) => readFile(path, 'utf8')),
);
const dependabotConfig = await readFile('.github/dependabot.yml', 'utf8');
const githubActionsPinsVerifier = await readFile(
  'scripts/verify-github-actions-pins.mjs',
  'utf8',
);
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
const isolatedProcessEnvironmentSource = await readFile(
  'scripts/lib/isolated-process-environment.mjs',
  'utf8',
);
const isolatedTemporaryRootSource = await readFile(
  'scripts/lib/isolated-temporary-root.mjs',
  'utf8',
);
const specializedConsumersVerifier = await readFile(
  'scripts/verify-packed-specialized-consumers.mjs',
  'utf8',
);
const packageArtifactConcurrencyVerifier = await readFile(
  'scripts/verify-package-artifact-concurrency.mjs',
  'utf8',
);
const packageArtifactSuite = await readFile(
  'scripts/verify-package-artifact-suite.mjs',
  'utf8',
);
const packageArtifactIndependenceVerifier = await readFile(
  'scripts/verify-package-artifact-independence.mjs',
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
const releaseCandidateCreator = await readFile(
  'scripts/create-release-candidate.mjs',
  'utf8',
);
const releaseCandidateVerifier = await readFile(
  'scripts/verify-release-candidate.mjs',
  'utf8',
);
const browserTestRunner = await readFile('scripts/run-browser-tests.mjs', 'utf8');
const registryReleaseVerifier = await readFile(
  'scripts/verify-registry-release.mjs',
  'utf8',
);
const packageExportVerifier = await readFile(
  'scripts/lib/package-export-contract.mjs',
  'utf8',
);
const consumerExportContract = await readJson('apps/package-export-contract.json');
const rootReadme = await readFile('README.md', 'utf8');
const packageReadme = await readFile('packages/mui-phone-input/README.md', 'utf8');
const contributingGuide = await readFile('CONTRIBUTING.md', 'utf8');
const npmIdentityVerifier = await readFile('scripts/check-npm-identity.mjs', 'utf8');
const publicIntakePattern =
  /github\.com\/wh1teee\/mui-phone-input\/discussions\/new\?category=q-a/u;

assert.equal(rootPackage.private, true);
assert.equal(rootPackage.packageManager, 'pnpm@11.27.0');
assert.match(rootPackage.engines.node, /24/u);
for (const workflow of pnpmWorkflowSources) {
  assert.match(workflow, /version:\s*11\.27\.0/u);
  assert.doesNotMatch(workflow, /version:\s*11\.9\.0/u);
}
for (const [scriptName, mode] of Object.entries({
  'docs:build': 'build',
  'docs:ci': 'ci',
  'docs:test': 'test',
  'docs:typecheck': 'typecheck',
})) {
  assert.equal(
    rootPackage.scripts[scriptName],
    `node scripts/run-docs-gvs.mjs ${mode}`,
  );
}
for (const requiredPackageExtension of [
  '"next@>=16.3.5 <17"',
  '"react-hook-form@>=7.83.0 <8"',
  '"@mui/material@>=9.4.0 <10"',
  '"@mui/styled-engine@>=9.4.0 <10"',
  '"@emotion/utils@>=1.4.2 <2"',
]) {
  assert.match(pnpmWorkspace, new RegExp(requiredPackageExtension, 'u'));
}
assert.match(docsGvsRunner, /install['"], ['"]--frozen-lockfile/u);
assert.match(docsGvsRunner, /MUI_PHONE_INPUT_KEEP_GVS_STAGE/u);
assert.match(docsGvsRunner, /generatedPathSegments/u);
for (const excludedState of ['.beads', '.git', 'node_modules', '.next']) {
  assert.match(
    docsGvsRunner,
    new RegExp(`['"]${excludedState.replace('.', '\\.')}['"]`, 'u'),
  );
}
assert.doesNotMatch(docsGvsRunner, /--store-dir/u);
assert.doesNotMatch(docsGvsRunner, /enableGlobalVirtualStore(?:=|['"],\s*['"])false/u);
assert.match(pnpmStoreTopology, /Cannot derive a bounded shared pnpm root/u);
assert.match(childProcessTreeSource, /process\.kill\(-pid, signal\)/u);
assert.match(childProcessTreeSource, /taskkill\.exe/u);
assert.match(childProcessTreeSource, /survived forced shutdown/u);
assert.match(packedConsumersVerifier, /detachedChildProcessOptions/u);
assert.match(packedConsumersVerifier, /terminateChildProcessTree/u);
assert.match(packedConsumersVerifier, /sharedGlobalStoreRoot/u);
for (const latestConsumerPin of [
  "'@mui/material': '9.4.0'",
  "react: '19.3.0'",
  "'react-dom': '19.3.0'",
  "'@mui/material-nextjs': '9.4.0'",
]) {
  assert.match(
    packedConsumersVerifier,
    new RegExp(latestConsumerPin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'),
  );
}
for (const latestSpecializedPin of ["'react-hook-form': '7.88.0'", "zod: '4.6.4'"]) {
  assert.match(
    specializedConsumersVerifier,
    new RegExp(latestSpecializedPin.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'),
  );
}
assert.match(packedConsumersVerifier, /const muiVersion =/u);
assert.match(packedConsumersVerifier, /@mui\/styled-engine.*muiVersion/u);
assert.match(nextConsumerConfig, /resolveBoundedTurbopackRoot/u);
assert.match(nextConsumerTurbopackRoot, /Refusing to use the filesystem root/u);
assert.match(docsGvsTopology, /kind:\s*['"]stage['"]/u);
assert.match(docsNextConfig, /resolveBoundedTurbopackRoot/u);
assert.match(docsTurbopackRoot, /Refusing to use the filesystem root/u);
assert.match(docsGvsPolicy, /does not disable GVS/u);
assert.match(docsGvsPolicy, /does not[\s\S]*switch to Webpack/u);
assert.match(docsGvsPolicy, /published library manifest is unchanged/u);
assert.equal(rootPackage.scripts['test:browser'], 'node scripts/run-browser-tests.mjs');
assert.match(browserTestRunner, /collectBrowserTests/u);
assert.match(browserTestRunner, /\.\.\.vitestFilters/u);
assert.match(browserTestRunner, /requestedFiles\.length > 0 \? displayPaths : \[\]/u);
assert.match(browserTestRunner, /VITEST_BROWSER_PORT/u);
assert.match(browserTestRunner, /--reporter=dot/u);
assert.doesNotMatch(browserTestRunner, /Promise\.all/u);
assert.doesNotMatch(
  browserTestRunner,
  /for \(const \[index, file\] of files\.entries\(\)\)/u,
);
assert.match(pnpmWorkspace, /^minimumReleaseAge:\s*1440$/mu);
assert.match(pnpmWorkspace, /^minimumReleaseAgeStrict:\s*false$/mu);
assert.match(packedConsumersVerifier, /['"]minimumReleaseAge:\s*1440['"]/u);
assert.match(packedConsumersVerifier, /['"]minimumReleaseAgeStrict:\s*false['"]/u);
assert.match(packedConsumersVerifier, /const composableDisplayValues = \[/u);
assert.match(packedConsumersVerifier, /expectedCallbackCount:\s*index \+ 1/u);
assert.doesNotMatch(
  packedConsumersVerifier,
  /composableInput\.pressSequentially\(['"]2025550123['"]\)/u,
);

assert.equal(packageManifest.name, '@wh1teee/mui-phone-input');
assert.equal(
  packageManifest.name.match(/^@([^/]+)\//u)?.[1],
  packageManifest.repository.url.match(/github\.com[/:]([^/]+)\//u)?.[1],
  'The npm package scope must match the GitHub repository owner.',
);
assert.match(npmIdentityVerifier, /authenticated-identity-mismatch/u);
assert.match(npmIdentityVerifier, /packageScope !== repositoryOwner/u);
assert.match(packageManifest.version, /^0\.1\.0-next\.\d+$/u);
assert.equal(packageManifest.type, 'module');
assert.deepEqual(packageManifest.sideEffects, [
  './dist/flags.css',
  './dist/shadcn.css',
]);
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
assert.equal(packageManifest.peerDependencies['@base-ui/react'], '^1.8.0');
for (const renderer of [
  '@base-ui/react',
  '@mui/material',
  '@emotion/react',
  '@emotion/styled',
]) {
  assert.equal(packageManifest.peerDependenciesMeta[renderer].optional, true);
}
assert.equal(
  rootPackage.scripts['verify:ui-adapters'],
  'node scripts/verify-packed-ui-adapters.mjs',
);
assert.equal(packageManifest.peerDependencies.react, '^19.0.0');
assert.equal(packageManifest.peerDependencies['@mui/material'], '^9.0.0');
assert.equal(packageManifest.peerDependencies['@types/react'], '^19.0.0');
assert.equal(packageManifest.peerDependencies['@emotion/react'], '^11.14.0');
assert.equal(packageManifest.peerDependencies['@emotion/styled'], '^11.14.0');
assert.equal(packageManifest.peerDependencies['react-hook-form'], '^7.0.0');
assert.equal(packageManifest.peerDependencies.zod, '^4.0.0');
assert.equal(packageManifest.peerDependenciesMeta['@types/react'].optional, true);
assert.equal(packageManifest.peerDependenciesMeta['react-hook-form'].optional, true);
assert.equal(packageManifest.peerDependenciesMeta.zod.optional, true);
assert.deepEqual(packageManifest.publishConfig, {
  access: 'public',
  provenance: true,
  tag: 'next',
});
assert.equal(packageManifest.dependencies['@maskito/core'], '5.4.0');
assert.equal(packageManifest.dependencies['@maskito/react'], '5.4.0');
assert.match(rootPackage.devDependencies['libphonenumber-js'], /^\d+\.\d+\.\d+$/u);
assert.equal(
  packageManifest.dependencies['libphonenumber-js'],
  rootPackage.devDependencies['libphonenumber-js'],
  'Root tooling and published package must use the same exact libphonenumber-js authority.',
);
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
  './flags',
  './flags.css',
  './locales/be',
  './locales/en',
  './locales/ru',
  './package.json',
]) {
  assert.ok(packageManifest.exports[exportPath], `Missing export ${exportPath}`);
}
for (const futureExportPath of ['./flags/local']) {
  assert.equal(
    packageManifest.exports[futureExportPath],
    undefined,
    `Future export ${futureExportPath} must remain absent.`,
  );
}
assert.deepEqual(consumerExportContract.implemented, [
  '.',
  './server',
  './react-hook-form',
  './zod',
  './metadata/max',
  './metadata/min',
  './metadata/mobile',
  './metadata/custom',
  './flags',
  './locales/be',
  './locales/en',
  './locales/ru',
  './package.json',
  './mui',
  './headless',
  './base-ui',
  './shadcn',
  './base-ui/react-hook-form',
  './shadcn/react-hook-form',
]);
assert.deepEqual(consumerExportContract.implementedAssets, [
  './flags.css',
  './shadcn.css',
]);
assert.deepEqual(consumerExportContract.optionalPeers, {
  './base-ui/react-hook-form': 'react-hook-form',
  './shadcn/react-hook-form': 'react-hook-form',
  './react-hook-form': 'react-hook-form',
  './zod': 'zod',
});
assert.deepEqual(consumerExportContract.intentionallyAbsent, {});

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
assert.equal(
  rootPackage.scripts['verify:github-actions-pins'],
  'node scripts/verify-github-actions-pins.mjs',
);
assert.match(rootPackage.scripts['ci:pr'], /verify:github-actions-pins/u);
assert.match(ciWorkflow, /pnpm ci:pr/u);
assert.match(githubActionsPinsVerifier, /\.github\/workflows/u);
assert.match(dependabotConfig, /package-ecosystem:\s*github-actions/u);
assert.match(dependabotConfig, /directory:\s*\//u);
assert.match(dependabotConfig, /interval:\s*weekly/u);
assert.match(rootPackage.scripts['ci:pr'], /verify:production-dependencies/u);
assert.match(rootPackage.scripts['ci:forward'], /verify:production-dependencies/u);
assert.match(rootPackage.scripts['verify:published-runtime'], /expected-major=24/u);
assert.match(rootPackage.scripts['ci:pr'], /verify:package-concurrency/u);
assert.match(packageArtifactSource, /mkdtemp\(join\(artifactsDirectory, ['"]run-/u);
assert.match(packageArtifactSource, /createIsolatedProcessEnvironment/u);
assert.doesNotMatch(packageArtifactSource, /env:\s*process\.env/u);
assert.match(isolatedProcessEnvironmentSource, /delete isolated\.NODE_PATH/u);
assert.match(isolatedProcessEnvironmentSource, /process\.env\.NODE_PATH/u);
assert.match(isolatedProcessEnvironmentSource, /registerHooks/u);
assert.match(isolatedTemporaryRootSource, /findAncestorPackage/u);
assert.match(isolatedTemporaryRootSource, /No isolated temporary root is available/u);
for (const isolatedConsumerVerifier of [
  packageArtifactSuite,
  packageArtifactIndependenceVerifier,
  packageArtifactConcurrencyVerifier,
  packedConsumersVerifier,
  specializedConsumersVerifier,
  publishedRuntimeVerifier,
  registryReleaseVerifier,
  packageExportVerifier,
  releaseCandidateCreator,
]) {
  assert.match(isolatedConsumerVerifier, /createIsolatedProcessEnvironment/u);
  assert.doesNotMatch(isolatedConsumerVerifier, /env:\s*process\.env/u);
}
assert.match(packageExportVerifier, /findAncestorPackage/u);
assert.match(
  packageExportVerifier,
  /must not resolve directly in the isolated consumer/u,
);
assert.doesNotMatch(packageArtifactSource, /rm\(artifactsDirectory/u);
assert.match(packageArtifactConcurrencyVerifier, /assert\.notEqual/u);
assert.match(packageArtifactConcurrencyVerifier, /siblingEvidencePath/u);
assert.match(productionDependenciesVerifier, /production-dependency-policy\.json/u);
assert.match(productionDependenciesVerifier, /audit\.error/u);
assert.match(
  productionDependenciesVerifier,
  /auditResult\.status\s*===\s*0\s*\|\|\s*advisories\.length\s*>\s*0/u,
);
assert.match(publishedRuntimeVerifier, /engine-strict=true/u);
assert.match(publishedRuntimeVerifier, /@wh1teee\/mui-phone-input\/server/u);
assert.match(publishedRuntimeVerifier, /--artifact=/u);
assert.match(packageExportVerifier, /ERR_PACKAGE_PATH_NOT_EXPORTED/u);
assert.match(packageExportVerifier, /expectedExportContract/u);
assert.match(packageExportVerifier, /data-only/u);
assert.match(ciWorkflow, /node-version:\s*22\.23\.1/u);
assert.match(ciWorkflow, /verify-published-runtime\.mjs\s+--expected-major=22/u);
assert.match(ciWorkflow, /published-runtime-artifact\.outputs\.tarball/u);
assert.match(
  ciWorkflow,
  /PACKAGE_ARTIFACT:\s*\$\{\{ steps\.published-runtime-artifact\.outputs\.tarball \}\}/u,
);
assert.equal(
  rootPackage.scripts['verify:package-artifact-suite'],
  'node scripts/verify-package-artifact-suite.mjs',
);
assert.match(rootPackage.scripts['ci:pr'], /verify:package-artifact-suite/u);
assert.match(packageArtifactSuite, /process\.env\.PACKAGE_ARTIFACT/u);
for (const verifier of [
  'verify-package.mjs',
  'verify-package-artifact-independence.mjs',
  'verify-published-runtime.mjs',
  'verify-tracer-package.mjs',
  'verify-packed-consumers.mjs',
]) {
  assert.match(packageArtifactSuite, new RegExp(verifier.replace('.', '\\.'), 'u'));
}
assert.match(packageArtifactSuite, /--artifact=\$\{tarball\}/u);
assert.match(
  packageArtifactIndependenceVerifier,
  /divergent local dist must never be inspected/u,
);
assert.match(packageArtifactIndependenceVerifier, /mutated\.tgz/u);
assert.match(releaseWorkflow, /tags:\s*\n\s*- v0\.1\.0-next\.\*/u);
assert.match(releaseWorkflow, /runs-on:\s*ubuntu-latest/u);
assert.match(releaseWorkflow, /id-token:\s*write/u);
assert.match(releaseWorkflow, /npm@11\.16\.0/u);
assert.match(releaseWorkflow, /create-release-candidate\.mjs/u);
assert.match(
  releaseWorkflow,
  /PACKAGE_ARTIFACT:\s*\$\{\{ steps\.candidate\.outputs\.tarball \}\}/u,
);
assert.match(releaseWorkflow, /verify-release-candidate\.mjs/u);
assert.match(releaseWorkflow, /verify-package\.mjs[\s\S]*--artifact=/u);
assert.match(releaseWorkflow, /verify-tracer-package\.mjs[\s\S]*--artifact=/u);
assert.match(releaseWorkflow, /verify-packed-consumers\.mjs[\s\S]*--artifact=/u);
assert.match(releaseWorkflow, /verify-published-runtime\.mjs[\s\S]*--artifact=/u);
assert.match(releaseWorkflow, /npm publish[\s\S]*candidate\.outputs\.tarball/u);
assert.match(releaseWorkflow, /--access public/u);
assert.match(releaseWorkflow, /--tag next/u);
assert.match(releaseWorkflow, /--provenance/u);
assert.match(releaseWorkflow, /verify-registry-release\.mjs/u);
assert.doesNotMatch(releaseWorkflow, /NODE_AUTH_TOKEN|NPM_TOKEN/u);
assert.match(releaseCandidateCreator, /pnpm[\s\S]*sbom/u);
assert.match(releaseCandidateCreator, /CycloneDX/u);
assert.match(releaseCandidateCreator, /SHA256SUMS/u);
assert.match(releaseCandidateVerifier, /packedManifest\.exports/u);
assert.match(releaseCandidateVerifier, /source\.commit/u);
assert.match(registryReleaseVerifier, /audit[\s\S]*signatures/u);
assert.match(registryReleaseVerifier, /candidate\.artifact\.sha256/u);
assert.equal(
  rootPackage.scripts['release:candidate'],
  'node scripts/create-release-candidate.mjs',
);
assert.equal(
  rootPackage.scripts['verify:release-candidate'],
  'node scripts/verify-release-candidate.mjs',
);

console.log('Workspace contract verified.');
