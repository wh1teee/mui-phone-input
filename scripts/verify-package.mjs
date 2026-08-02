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
  'package/dist/server.js',
  'package/dist/server.d.ts',
]) {
  assert.match(contents, new RegExp(`^${requiredFile}$`, 'mu'));
}

assert.doesNotMatch(contents, /^package\/src\//mu);

const packageDist = join(repositoryRoot, 'packages/mui-phone-input/dist');
const serverBundle = await readFile(join(packageDist, 'server.js'), 'utf8');
const clientBundle = await readFile(join(packageDist, 'index.js'), 'utf8');
const serverModule = await import(
  `${pathToFileURL(join(packageDist, 'server.js')).href}?verification=${Date.now()}`
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
assert.deepEqual(serverModule.resolveNumberingPlan('+800'), {
  countryCallingCode: '800',
  detectedCountry: null,
  kind: 'non-geographic',
  possibleCountries: [],
  resolvedCountry: null,
  selectedCountry: null,
});
assert.match(clientBundle, /process\.env\.NODE_ENV\s*!==\s*["']production["']/u);
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
