import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
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
run('pnpm', ['exec', 'attw', tarball, '--profile', 'esm-only']);
await verifyPackageExportContract(tarball);

const contents = execFileSync('tar', ['-tf', tarball], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});

for (const requiredFile of [
  'package/package.json',
  'package/LICENSE',
  'package/README.md',
  'package/THIRD_PARTY_NOTICES.md',
  'package/dist/index.js',
  'package/dist/index.d.ts',
  'package/dist/index.js.map',
  'package/dist/server.js',
  'package/dist/server.d.ts',
  'package/dist/server.js.map',
]) {
  assert.match(contents, new RegExp(`^${requiredFile}$`, 'mu'));
}

assert.doesNotMatch(contents, /^package\/src\//mu);

const packedManifest = JSON.parse(
  execFileSync('tar', ['-xOf', tarball, 'package/package.json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }),
);
assert.equal(
  packedManifest.engines,
  undefined,
  'Published package metadata must not expose the maintainer Node floor.',
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
assert.equal(
  packedManifest.dependencies?.tabbable,
  '6.5.0',
  'Published package metadata must pin the reviewed tabbable runtime.',
);
const packedReadme = execFileSync('tar', ['-xOf', tarball, 'package/README.md'], {
  cwd: repositoryRoot,
  encoding: 'utf8',
});
assert.match(
  packedReadme,
  /github\.com\/wh1teee\/mui-phone-input\/discussions\/new\?category=q-a/u,
);
assert.doesNotMatch(packedReadme, /github\.com\/wh1teee\/mui-phone-input\/issues/u);

const packedClientSourceMap = JSON.parse(
  execFileSync('tar', ['-xOf', tarball, 'package/dist/index.js.map'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }),
);
const packedServerSourceMap = JSON.parse(
  execFileSync('tar', ['-xOf', tarball, 'package/dist/server.js.map'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }),
);
for (const requiredClientSource of [
  '../src/PhoneInputCountrySelector.tsx',
  '../src/PhoneInputPrimitives.tsx',
  '../src/MuiPhoneInput/MuiPhoneInput.tsx',
  '../src/internal/use-input-transaction-engine.ts',
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
]);
for (const forbiddenServerSource of [
  'MuiPhoneInput',
  'PhoneInput',
  '/internal/',
  'react-hook-form',
]) {
  assert.ok(
    packedServerSourceMap.sources.every(
      (source) => !source.includes(forbiddenServerSource),
    ),
    `Packed neutral server graph contains ${forbiddenServerSource}.`,
  );
}

const packageDist = join(repositoryRoot, 'packages/mui-phone-input/dist');
const serverBundle = await readFile(join(packageDist, 'server.js'), 'utf8');
const clientBundle = await readFile(join(packageDist, 'index.js'), 'utf8');
const clientTypes = await readFile(join(packageDist, 'index.d.ts'), 'utf8');
const serverModule = await import(
  `${pathToFileURL(join(packageDist, 'server.js')).href}?verification=${Date.now()}`
);
const clientModule = await import(
  `${pathToFileURL(join(packageDist, 'index.js')).href}?verification=${Date.now()}`
);

for (const forbiddenServerDependency of ['react', '@mui/', '@emotion/', 'react-dom']) {
  assert.doesNotMatch(
    serverBundle,
    new RegExp(forbiddenServerDependency.replace('/', '\\/'), 'u'),
  );
}

for (const forbiddenServerGlobal of [
  'document',
  'window',
  'navigator',
  'localStorage',
  'sessionStorage',
]) {
  assert.doesNotMatch(serverBundle, new RegExp(`\\b${forbiddenServerGlobal}\\b`, 'u'));
}

assert.doesNotMatch(serverBundle, /from\s+['"]node:/u);
assert.doesNotMatch(clientBundle, /from\s+['"]node:/u);
assert.match(serverBundle, /from\s+["']libphonenumber-js\/max["']/u);
assert.match(clientBundle, /from\s+["']libphonenumber-js\/max["']/u);
assert.doesNotMatch(serverBundle, /from\s+["']tabbable["']/u);
assert.match(clientBundle, /from\s+["']tabbable["']/u);
assert.match(
  clientTypes,
  /type PhoneCountryChangeReason = "default" \| "external-value" \| "input" \| "paste" \| "reset" \| "user";/u,
);
assert.match(
  clientTypes,
  /onCountryChange\?: \(country: CountryCode \| null, details: PhoneCountryChangeDetails\) => void;/u,
);
assert.match(
  clientTypes,
  /type PhoneCountrySelectionResult = PhoneCountrySelectionAppliedResult \| PhoneCountrySelectionConflictResult;/u,
);
assert.match(
  clientTypes,
  /type PhoneCountrySelectionAppliedReason = "calling-code-initialized" \| "calling-code-preserved" \| "national-digits-preserved" \| "partial-calling-code-replaced";/u,
);
assert.match(
  clientTypes,
  /type PhoneCountrySelectionConflictReason = "incompatible-draft" \| "impossible-target-draft" \| "non-geographic-draft";/u,
);
assert.match(
  clientTypes,
  /onCountrySelection\?: \(result: PhoneCountrySelectionResult\) => void;/u,
);
assert.match(
  clientTypes,
  /selectCountry\(country: CountryCode\): PhoneCountrySelectionResult;/u,
);
assert.equal(typeof clientModule.MuiPhoneInput, 'function');
assert.equal(serverModule.MuiPhoneInput, undefined);
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
    countryCallingCode: '247',
    detectedCountry: 'AC',
    kind: 'geographic',
    possibleCountries: ['AC'],
    resolvedCountry: 'AC',
    selectedCountry: null,
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
  reason: 'impossible-target-draft',
  status: 'conflict',
  value: '+24740123',
});
assert.equal(clientModule.selectPhoneCountryValue('+24740123', 'AZ'), '+24740123');
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
  reason: 'incompatible-draft',
  status: 'conflict',
  value: '+12025550123',
});
assert.equal(
  clientModule.selectPhoneCountryValue('+12025550123', 'CA'),
  '+12025550123',
);
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

run('pnpm', [
  '--dir',
  'packages/mui-phone-input',
  'publish',
  '--dry-run',
  '--no-git-checks',
]);

console.log(`Package artifact verified: ${tarball}`);
