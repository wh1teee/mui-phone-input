import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createPackageArtifact, repositoryRoot, run } from './lib/package-artifact.mjs';

const tarball = await createPackageArtifact();

run('pnpm', ['exec', 'publint', 'run', tarball, '--strict']);
run('pnpm', ['exec', 'attw', tarball, '--profile', 'esm-only']);

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
assert.equal(
  clientModule.selectPhoneCountryValue('+12025550123', 'BY'),
  '+3752025550123',
);
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
  possibleCountries: ['FI'],
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
