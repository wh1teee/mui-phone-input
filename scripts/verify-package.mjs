import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdtemp, readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createPackageArtifact, repositoryRoot, run } from './lib/package-artifact.mjs';
import { verifyPackageExportContract } from './lib/package-export-contract.mjs';

const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);
const tarball = artifactArgument
  ? resolve(artifactArgument.slice('--artifact='.length))
  : await createPackageArtifact();
await readFile(tarball);

run('pnpm', ['exec', 'publint', 'run', tarball, '--strict']);
run('pnpm', [
  'exec',
  'attw',
  tarball,
  '--profile',
  'esm-only',
  '--exclude-entrypoints',
  './flags.css',
]);
const extractionRoot = await mkdtemp(
  join(repositoryRoot, 'packages/mui-phone-input/.verify-package-'),
);
process.once('exit', () => {
  rmSync(extractionRoot, { force: true, recursive: true });
});
execFileSync('tar', ['-xzf', tarball, '-C', extractionRoot], {
  cwd: repositoryRoot,
});
const packageRoot = join(extractionRoot, 'package');
const packageEntries = await readdir(packageRoot, { recursive: true });
const contents = packageEntries.map((entry) => `package/${entry}`).join('\n');
await verifyPackageExportContract(tarball, {
  extractedPackageRoot: packageRoot,
});

for (const requiredFile of [
  'package/package.json',
  'package/LICENSE',
  'package/README.md',
  'package/THIRD_PARTY_NOTICES.md',
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/index.js.map',
  'package/dist/react-hook-form.js',
  'package/dist/react-hook-form.d.ts',
  'package/dist/react-hook-form.js.map',
  'package/dist/metadata/custom.js',
  'package/dist/metadata/custom.d.ts',
  'package/dist/metadata/max.js',
  'package/dist/metadata/max.d.ts',
  'package/dist/metadata/max.js.map',
  'package/dist/metadata/min.js',
  'package/dist/metadata/min.d.ts',
  'package/dist/metadata/min.js.map',
  'package/dist/metadata/mobile.js',
  'package/dist/metadata/mobile.d.ts',
  'package/dist/metadata/mobile.js.map',
  'package/dist/flags.css',
  'package/dist/flags.js',
  'package/dist/flags.d.ts',
  'package/dist/flags.js.map',
  'package/dist/flags/3x2/BY.svg',
  'package/dist/locales/be.js',
  'package/dist/locales/be.d.ts',
  'package/dist/locales/be.js.map',
  'package/dist/locales/en.js',
  'package/dist/locales/en.d.ts',
  'package/dist/locales/en.js.map',
  'package/dist/locales/ru.js',
  'package/dist/locales/ru.d.ts',
  'package/dist/locales/ru.js.map',
  'package/dist/server.js',
  'package/dist/server.d.ts',
  'package/dist/server.js.map',
  'package/dist/zod.js',
  'package/dist/zod.d.ts',
  'package/dist/zod.js.map',
]) {
  assert.match(contents, new RegExp(`^${requiredFile}$`, 'mu'));
}

assert.doesNotMatch(contents, /^package\/src\//mu);
assert.equal(
  contents.match(/^package\/dist\/flags\/3x2\/[^/]+\.svg$/gmu)?.length ?? 0,
  265,
  'Packed local flag assets must match the pinned country-flag-icons 1.6.20 3x2 set.',
);

const packedManifest = JSON.parse(
  await readFile(join(packageRoot, 'package.json'), 'utf8'),
);
assert.equal(
  packedManifest.engines,
  undefined,
  'Published package metadata must not expose the maintainer Node floor.',
);
assert.deepEqual(
  packedManifest.sideEffects,
  ['./dist/flags.css'],
  'Only the generated local flag stylesheet may be marked as a package side effect.',
);
assert.equal(
  packedManifest.bugs?.url,
  'https://github.com/wh1teee/mui-phone-input/discussions/new?category=q-a',
  'Published package metadata must point to the supported public intake.',
);
assert.doesNotMatch(
  JSON.stringify(packedManifest),
  /github\.com\/wh1teee\/mui-phone-input\/issues/u,
);
assert.deepEqual(
  packedManifest.dependencies,
  {
    '@maskito/core': '5.3.1',
    '@maskito/react': '5.3.1',
    'libphonenumber-js': '1.13.10',
    tabbable: '6.5.0',
  },
  'Published runtime dependencies differ from the reviewed feature-complete contract.',
);
assert.deepEqual(
  packedManifest.peerDependencies,
  {
    '@emotion/react': '^11.14.0',
    '@emotion/styled': '^11.14.0',
    '@mui/material': '^9.0.0',
    react: '^19.0.0',
    'react-dom': '^19.0.0',
    'react-hook-form': '^7.0.0',
    zod: '^4.0.0',
  },
  'Published peer dependencies differ from the reviewed feature-complete contract.',
);
assert.deepEqual(
  packedManifest.peerDependenciesMeta,
  {
    'react-hook-form': { optional: true },
    zod: { optional: true },
  },
  'Only RHF and Zod may be optional integration peers.',
);
assert.equal(
  packedManifest.dependencies?.['country-flag-icons'],
  undefined,
  'Generated local flag assets must not create a runtime country-flag-icons dependency.',
);
assert.equal(
  packedManifest.devDependencies?.['country-flag-icons'],
  '1.6.20',
  'Local flag generation must stay pinned to the reviewed country-flag-icons release.',
);
const packedReadme = await readFile(join(packageRoot, 'README.md'), 'utf8');
assert.match(
  packedReadme,
  /github\.com\/wh1teee\/mui-phone-input\/discussions\/new\?category=q-a/u,
);
assert.doesNotMatch(packedReadme, /github\.com\/wh1teee\/mui-phone-input\/issues/u);
const packedThirdPartyNotices = await readFile(
  join(packageRoot, 'THIRD_PARTY_NOTICES.md'),
  'utf8',
);
assert.match(packedThirdPartyNotices, /country-flag-icons@1\.6\.20/u);
assert.match(
  packedThirdPartyNotices,
  /Copyright \(c\) 2020 @catamphetamine <purecatamphetamine@gmail\.com>/u,
);
for (const notice of [
  /@maskito\/core.*@maskito\/react.*5\.3\.1/su,
  /libphonenumber-js/u,
  /tabbable@6\.5\.0/u,
]) {
  assert.match(
    packedThirdPartyNotices,
    notice,
    'Packed third-party notices do not cover the reviewed runtime dependency set.',
  );
}

const packedClientSourceMap = JSON.parse(
  await readFile(join(packageRoot, 'dist/index.js.map'), 'utf8'),
);
const packedServerSourceMap = JSON.parse(
  await readFile(join(packageRoot, 'dist/server.js.map'), 'utf8'),
);
const packedReactHookFormSourceMap = JSON.parse(
  await readFile(join(packageRoot, 'dist/react-hook-form.js.map'), 'utf8'),
);
const packedZodSourceMap = JSON.parse(
  await readFile(join(packageRoot, 'dist/zod.js.map'), 'utf8'),
);
for (const requiredClientSource of [
  '../src/PhoneInputCountrySelector.tsx',
  '../src/PhoneInputPrimitives.tsx',
  '../src/MuiPhoneInput/MuiPhoneInput.tsx',
  '../src/internal/use-input-transaction-engine.ts',
  '../src/phone-extension.ts',
  '../src/usePhoneInput.ts',
]) {
  assert.ok(
    packedClientSourceMap.sources.includes(requiredClientSource),
    `Packed browser graph is missing ${requiredClientSource}.`,
  );
}
assert.deepEqual(packedServerSourceMap.sources, [
  '../src/digit-pattern-prefix.ts',
  '../src/phone-value.ts',
  '../src/numbering-plan.ts',
  '../src/phone-validation.ts',
  '../src/phone-extension.ts',
]);
for (const forbiddenServerSource of [
  'MuiPhoneInput',
  'PhoneInput',
  '/internal/',
  'react-hook-form',
  '/zod.ts',
]) {
  assert.ok(
    packedServerSourceMap.sources.every(
      (source) => !source.includes(forbiddenServerSource),
    ),
    `Packed neutral server graph contains ${forbiddenServerSource}.`,
  );
}
assert.ok(
  packedClientSourceMap.sources.every(
    (source) => !source.includes('/react-hook-form.tsx') && !source.includes('/zod.ts'),
  ),
  'Packed main graph must not contain optional adapter sources.',
);
for (const forbiddenClientSource of [
  '/locales/',
  '/server.ts',
  '/metadata/max.ts',
  '/metadata/min.ts',
  '/metadata/mobile.ts',
]) {
  assert.ok(
    packedClientSourceMap.sources.every(
      (source) => !source.includes(forbiddenClientSource),
    ),
    `Packed main graph unexpectedly contains ${forbiddenClientSource}.`,
  );
}
assert.ok(
  packedReactHookFormSourceMap.sources.includes('../src/react-hook-form.tsx'),
  'Packed RHF adapter graph is missing its public entry source.',
);
assert.ok(
  packedReactHookFormSourceMap.sources.every((source) => !source.includes('/zod.ts')),
  'Packed RHF adapter graph must not contain the Zod adapter.',
);
assert.ok(
  packedZodSourceMap.sources.includes('../src/zod.ts'),
  'Packed Zod adapter graph is missing its public entry source.',
);
assert.ok(
  packedZodSourceMap.sources.every(
    (source) =>
      !source.includes('/react-hook-form.tsx') && !source.includes('MuiPhoneInput'),
  ),
  'Packed Zod adapter graph must remain React/MUI-free.',
);

const packageDist = join(packageRoot, 'dist');
const serverBundle = await readFile(join(packageDist, 'server.js'), 'utf8');
const clientBundle = await readFile(join(packageDist, 'index.js'), 'utf8');
const reactHookFormBundle = await readFile(
  join(packageDist, 'react-hook-form.js'),
  'utf8',
);
const zodBundle = await readFile(join(packageDist, 'zod.js'), 'utf8');
const serverMetadataChunk = serverBundle.match(
  /from\s+["']\.\/(phone-metadata-[^"']+\.js)["']/u,
)?.[1];
assert.ok(
  serverMetadataChunk,
  'Server bundle must import the neutral metadata runtime chunk.',
);
const serverMetadataBundle = await readFile(
  join(packageDist, serverMetadataChunk),
  'utf8',
);
const declarationFiles = (await readdir(packageDist, { recursive: true })).filter(
  (filename) => filename.endsWith('.d.ts'),
);
const clientTypes = (
  await Promise.all(
    declarationFiles.map((filename) => readFile(join(packageDist, filename), 'utf8')),
  )
).join('\n');
const flagsBundle = await readFile(join(packageDist, 'flags.js'), 'utf8');
const flagsStylesheet = await readFile(join(packageDist, 'flags.css'), 'utf8');
const localeBundles = Object.fromEntries(
  await Promise.all(
    ['be', 'en', 'ru'].map(async (locale) => [
      locale,
      await readFile(join(packageDist, 'locales', `${locale}.js`), 'utf8'),
    ]),
  ),
);
const serverModule = await import(
  `${pathToFileURL(join(packageDist, 'server.js')).href}?verification=${Date.now()}`
);
const clientModule = await import(
  `${pathToFileURL(join(packageDist, 'index.js')).href}?verification=${Date.now()}`
);

for (const forbiddenServerDependency of ['react', '@mui/', '@emotion/', 'react-dom']) {
  const pattern = new RegExp(forbiddenServerDependency.replace('/', '\\/'), 'u');
  assert.doesNotMatch(serverBundle, pattern);
  assert.doesNotMatch(serverMetadataBundle, pattern);
}

for (const forbiddenServerGlobal of [
  'document',
  'fetch',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
  'WebSocket',
]) {
  const pattern = new RegExp(`\\b${forbiddenServerGlobal}\\b`, 'u');
  assert.doesNotMatch(serverBundle, pattern);
  assert.doesNotMatch(serverMetadataBundle, pattern);
}

assert.doesNotMatch(serverBundle, /from\s+['"]node:/u);
assert.doesNotMatch(serverMetadataBundle, /from\s+['"]node:/u);
assert.doesNotMatch(clientBundle, /from\s+['"]node:/u);
for (const coreBundle of [clientBundle, serverBundle, serverMetadataBundle]) {
  assert.doesNotMatch(coreBundle, /from\s+["']react-hook-form["']/u);
  assert.doesNotMatch(coreBundle, /from\s+["']zod["']/u);
}
assert.match(reactHookFormBundle, /from\s+["']react-hook-form["']/u);
assert.doesNotMatch(reactHookFormBundle, /from\s+["']zod["']/u);
assert.match(zodBundle, /from\s+["']zod["']/u);
assert.doesNotMatch(zodBundle, /from\s+["']react-hook-form["']/u);
for (const forbiddenZodDependency of ['react', '@mui/', '@emotion/', 'react-dom']) {
  assert.doesNotMatch(
    zodBundle,
    new RegExp(`from\\s+["']${forbiddenZodDependency.replace('/', '\\/')}`, 'u'),
  );
}
for (const forbiddenZodGlobal of [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
]) {
  assert.doesNotMatch(zodBundle, new RegExp(`\\b${forbiddenZodGlobal}\\b`, 'u'));
}
assert.doesNotMatch(clientBundle, /data:image\/svg\+xml/u);
assert.doesNotMatch(clientBundle, /<svg/u);
assert.doesNotMatch(flagsBundle, /data:image\/svg\+xml/u);
assert.doesNotMatch(flagsBundle, /<svg/u);
assert.doesNotMatch(flagsBundle, /country-flag-icons/u);
assert.doesNotMatch(flagsBundle, /import\s+["'][^"']*flags\.css["']/u);
assert.doesNotMatch(flagsStylesheet, /data:image\/svg\+xml/u);
assert.match(
  flagsStylesheet,
  /\.flag\\:BY\{background-image:url\("\.\/flags\/3x2\/BY\.svg"\)\}/u,
);
for (const [locale, source] of Object.entries(localeBundles)) {
  assert.ok(
    source.length < 1_024,
    `${locale} locale entrypoint is unexpectedly large.`,
  );
  assert.doesNotMatch(source, /@mui\/|react|\.\/locales\//u);
  for (const otherLocale of Object.keys(localeBundles).filter(
    (candidate) => candidate !== locale,
  )) {
    assert.doesNotMatch(
      source,
      new RegExp(`locales\\/${otherLocale}|${otherLocale}\\.js`, 'u'),
      `${locale} locale entrypoint imports ${otherLocale}.`,
    );
  }
}
assert.match(serverBundle, /from\s+["']libphonenumber-js\/core["']/u);
assert.match(serverMetadataBundle, /from\s+["']libphonenumber-js\/core["']/u);
assert.match(
  serverMetadataBundle,
  /from\s+["']libphonenumber-js\/metadata\.max\.json["']/u,
);
assert.match(clientBundle, /from\s+["']libphonenumber-js\/core["']/u);
assert.match(clientBundle, /from\s+["']libphonenumber-js\/metadata\.max\.json["']/u);
for (const bundle of [serverBundle, serverMetadataBundle, clientBundle]) {
  assert.doesNotMatch(bundle, /from\s+["']libphonenumber-js\/max["']/u);
}
assert.doesNotMatch(serverBundle, /from\s+["']tabbable["']/u);
assert.match(clientBundle, /from\s+["']tabbable["']/u);
assert.match(
  clientTypes,
  /type PhoneCountryChangeReason = "default" \| "external-value" \| "input" \| "paste" \| "reset" \| "user";/u,
);
assert.match(
  clientTypes,
  /onCountryChange\?: \(country: CountryCode(?:\$\d+)? \| null, details: PhoneCountryChangeDetails\) => void;/u,
);
assert.match(
  clientTypes,
  /type PhoneCountrySelectionResult = PhoneCountrySelectionAppliedResult;/u,
);
assert.match(
  clientTypes,
  /type PhoneCountrySelectionAppliedReason = "calling-code-initialized" \| "calling-code-preserved" \| "national-digits-preserved" \| "partial-calling-code-replaced";/u,
);
assert.doesNotMatch(clientTypes, /PhoneCountrySelectionConflict/u);
assert.match(
  clientTypes,
  /onCountrySelection\?: \(result: PhoneCountrySelectionResult\) => void;/u,
);
assert.match(
  clientTypes,
  /selectCountry\(country: CountryCode(?:\$\d+)?\): PhoneCountrySelectionResult;/u,
);
assert.equal(typeof clientModule.MuiPhoneInput, 'function');
assert.equal(serverModule.MuiPhoneInput, undefined);
assert.equal(typeof clientModule.validatePhoneMetadata, 'function');
assert.equal(typeof serverModule.validatePhoneMetadata, 'function');
for (const clientExport of [
  'PhoneInputCountrySelector',
  'PhoneInputInput',
  'PhoneInputProvider',
  'PhoneInputRoot',
  'PhoneInputValidationMessage',
  'createPhoneCountryOptions',
  'filterPhoneCountryOptions',
  'resolvePhoneCountrySelection',
  'selectPhoneCountryValue',
  'usePhoneInput',
  'usePhoneInputContext',
]) {
  assert.equal(typeof clientModule[clientExport], 'function');
  assert.equal(serverModule[clientExport], undefined);
}
const countryOptions = clientModule.createPhoneCountryOptions({
  preferredCountries: ['BY', 'US', 'BY'],
});
assert.deepEqual(
  countryOptions.slice(0, 2).map((option) => option.country),
  ['BY', 'US'],
);
assert.equal(
  clientModule.filterPhoneCountryOptions(countryOptions, '+375')[0]?.country,
  'BY',
);
assert.equal(clientModule.selectPhoneCountryValue('+24740123', 'DE'), '+4940123');
assert.deepEqual(clientModule.resolvePhoneCountrySelection('+24740123', 'AZ'), {
  candidateNumberingPlan: {
    countryCallingCode: '994',
    detectedCountry: 'AZ',
    kind: 'geographic',
    possibleCountries: ['AZ'],
    resolvedCountry: 'AZ',
    selectedCountry: 'AZ',
  },
  candidateValue: '+99440123',
  country: 'AZ',
  numberingPlan: {
    countryCallingCode: '994',
    detectedCountry: 'AZ',
    kind: 'geographic',
    possibleCountries: ['AZ'],
    resolvedCountry: 'AZ',
    selectedCountry: 'AZ',
  },
  previousNumberingPlan: {
    countryCallingCode: '247',
    detectedCountry: 'AC',
    kind: 'geographic',
    possibleCountries: ['AC'],
    resolvedCountry: 'AC',
    selectedCountry: null,
  },
  previousValue: '+24740123',
  reason: 'national-digits-preserved',
  status: 'applied',
  value: '+99440123',
});
assert.equal(clientModule.selectPhoneCountryValue('+24740123', 'AZ'), '+99440123');
assert.deepEqual(clientModule.resolvePhoneCountrySelection('+12025550123', 'CA'), {
  candidateNumberingPlan: {
    countryCallingCode: '1',
    detectedCountry: 'US',
    kind: 'geographic',
    possibleCountries: ['US'],
    resolvedCountry: 'US',
    selectedCountry: null,
  },
  candidateValue: '+12025550123',
  country: 'CA',
  numberingPlan: {
    countryCallingCode: '1',
    detectedCountry: 'US',
    kind: 'geographic',
    possibleCountries: ['US'],
    resolvedCountry: 'US',
    selectedCountry: null,
  },
  previousNumberingPlan: {
    countryCallingCode: '1',
    detectedCountry: 'US',
    kind: 'geographic',
    possibleCountries: ['US'],
    resolvedCountry: 'US',
    selectedCountry: null,
  },
  previousValue: '+12025550123',
  reason: 'calling-code-preserved',
  status: 'applied',
  value: '+12025550123',
});
assert.equal(
  clientModule.selectPhoneCountryValue('+12025550123', 'CA'),
  '+12025550123',
);
assert.deepEqual(clientModule.resolvePhoneCountrySelection('+80012345678', 'BY'), {
  candidateNumberingPlan: {
    countryCallingCode: '375',
    detectedCountry: 'BY',
    kind: 'geographic',
    possibleCountries: ['BY'],
    resolvedCountry: 'BY',
    selectedCountry: null,
  },
  candidateValue: '+37512345678',
  country: 'BY',
  numberingPlan: {
    countryCallingCode: '375',
    detectedCountry: 'BY',
    kind: 'geographic',
    possibleCountries: ['BY'],
    resolvedCountry: 'BY',
    selectedCountry: null,
  },
  previousNumberingPlan: {
    countryCallingCode: '800',
    detectedCountry: null,
    kind: 'non-geographic',
    possibleCountries: [],
    resolvedCountry: null,
    selectedCountry: null,
  },
  previousValue: '+80012345678',
  reason: 'national-digits-preserved',
  status: 'applied',
  value: '+37512345678',
});
assert.deepEqual(clientModule.resolvePhoneCountrySelection('+37', 'BY'), {
  candidateNumberingPlan: {
    countryCallingCode: '375',
    detectedCountry: 'BY',
    kind: 'geographic',
    possibleCountries: ['BY'],
    resolvedCountry: 'BY',
    selectedCountry: 'BY',
  },
  candidateValue: '+375',
  country: 'BY',
  numberingPlan: {
    countryCallingCode: '375',
    detectedCountry: 'BY',
    kind: 'geographic',
    possibleCountries: ['BY'],
    resolvedCountry: 'BY',
    selectedCountry: 'BY',
  },
  previousNumberingPlan: {
    countryCallingCode: null,
    detectedCountry: null,
    kind: 'unresolved',
    possibleCountries: [],
    resolvedCountry: null,
    selectedCountry: null,
  },
  previousValue: '+37',
  reason: 'partial-calling-code-replaced',
  status: 'applied',
  value: '+375',
});
assert.equal(clientModule.selectPhoneCountryValue('+3', 'BY'), '+375');
assert.equal(clientModule.selectPhoneCountryValue('+37', 'BY'), '+375');
const sharedPlan = serverModule.resolveNumberingPlan('+1');
assert.deepEqual(sharedPlan, {
  countryCallingCode: '1',
  detectedCountry: null,
  kind: 'unresolved',
  possibleCountries: sharedPlan.possibleCountries,
  resolvedCountry: null,
  selectedCountry: null,
});
assert.equal(sharedPlan.possibleCountries.length, 25);
assert.ok(sharedPlan.possibleCountries.includes('CA'));
assert.ok(sharedPlan.possibleCountries.includes('US'));
const selectedUsDraft = {
  countryCallingCode: '1',
  detectedCountry: null,
  kind: 'geographic',
  possibleCountries: ['CA', 'US'],
  resolvedCountry: 'US',
  selectedCountry: 'US',
};
assert.deepEqual(
  clientModule.resolveNumberingPlan('+12015550', { selectedCountry: 'US' }),
  selectedUsDraft,
);
assert.deepEqual(
  serverModule.resolveNumberingPlan('+12015550', { selectedCountry: 'US' }),
  selectedUsDraft,
);
assert.deepEqual(serverModule.resolveNumberingPlan('+12025550123'), {
  countryCallingCode: '1',
  detectedCountry: 'US',
  kind: 'geographic',
  possibleCountries: ['US'],
  resolvedCountry: 'US',
  selectedCountry: null,
});
const alandPlan = {
  countryCallingCode: '358',
  detectedCountry: 'FI',
  kind: 'geographic',
  possibleCountries: ['FI', 'AX'],
  resolvedCountry: 'AX',
  selectedCountry: 'AX',
};
assert.deepEqual(
  clientModule.resolveNumberingPlan('+358412345678', { selectedCountry: 'AX' }),
  alandPlan,
);
assert.deepEqual(
  serverModule.resolveNumberingPlan('+358412345678', { selectedCountry: 'AX' }),
  alandPlan,
);
assert.deepEqual(serverModule.resolveNumberingPlan('+800'), {
  countryCallingCode: '800',
  detectedCountry: null,
  kind: 'non-geographic',
  possibleCountries: [],
  resolvedCountry: null,
  selectedCountry: null,
});
assert.equal(
  serverModule.formatPhoneValueForDisplay('+375291234567'),
  '+375 29 123 45 67',
);
assert.deepEqual(serverModule.validatePhoneValue('+441481123456'), {
  accepted: true,
  isPossible: true,
  isValid: false,
  mode: 'possible',
  numberType: null,
  reason: 'possible',
  status: 'possible',
  value: '+441481123456',
});
assert.deepEqual(
  serverModule.validatePhoneValue('+441481123456', { validationMode: 'valid' }),
  {
    accepted: false,
    isPossible: true,
    isValid: false,
    mode: 'valid',
    numberType: null,
    reason: 'strict-validity-required',
    status: 'possible',
    value: '+441481123456',
  },
);
assert.deepEqual(serverModule.validatePhoneValue('+80012345678'), {
  accepted: true,
  isPossible: true,
  isValid: true,
  mode: 'possible',
  numberType: 'TOLL_FREE',
  reason: 'valid',
  status: 'valid',
  value: '+80012345678',
});
assert.match(
  clientBundle,
  /typeof process\s*===\s*["']undefined["']\s*\|\|\s*process\.env\.NODE_ENV\s*!==\s*["']production["']/u,
);
assert.doesNotMatch(
  clientBundle,
  /function shouldWarnInDevelopment\(\)\s*\{\s*return true/u,
);

run('pnpm', ['publish', tarball, '--dry-run', '--no-git-checks']);

console.log(`Package artifact verified: ${tarball}`);
