import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile } from 'node:fs/promises';

const require = createRequire(import.meta.url);
const nativeSpecifier = 'npm:typescript@7.0.2';
const compatibilitySpecifier = 'npm:@typescript/typescript6@6.0.2';
const manifests = [
  'package.json',
  'packages/mui-phone-input/package.json',
  'apps/docs/package.json',
  'apps/next-consumer/package.json',
  'apps/vite-consumer/package.json',
];

for (const filename of manifests) {
  const manifest = JSON.parse(await readFile(filename, 'utf8'));
  assert.equal(
    manifest.devDependencies?.['@typescript/native'],
    nativeSpecifier,
    `${filename} must use the stable native TypeScript 7 compiler.`,
  );
  assert.equal(
    manifest.devDependencies?.typescript,
    compatibilitySpecifier,
    `${filename} must expose the official TypeScript 6 compatibility API to tools that still embed the compiler.`,
  );
}

function commandVersion(command, args = []) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

assert.equal(commandVersion('pnpm', ['exec', 'tsc', '--version']), 'Version 7.0.2');
assert.match(commandVersion('pnpm', ['exec', 'tsc6', '--version']), /^Version 6\.0\./u);
assert.equal(
  commandVersion('pnpm', [
    '--filter',
    '@wh1teee/mui-phone-input',
    'exec',
    'tsc',
    '--version',
  ]),
  'Version 7.0.2',
);

const compatibilityPackage = require('typescript/package.json');
const nativePackage = require('@typescript/native/package.json');
const compatibilityApi = require('typescript');
assert.equal(compatibilityPackage.name, '@typescript/typescript6');
assert.equal(compatibilityPackage.version, '6.0.2');
assert.equal(nativePackage.name, 'typescript');
assert.equal(nativePackage.version, '7.0.2');
assert.match(compatibilityApi.version, /^6\.0\./u);
assert.equal(typeof compatibilityApi.createProgram, 'function');
assert.equal(typeof compatibilityApi.transpileModule, 'function');

console.log(
  JSON.stringify(
    {
      verified: true,
      compiler: commandVersion('pnpm', ['exec', 'tsc', '--version']),
      compatibilityPackage: `${compatibilityPackage.name}@${compatibilityPackage.version}`,
      compatibilityApi: compatibilityApi.version,
    },
    null,
    2,
  ),
);
