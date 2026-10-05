import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = join(repositoryRoot, 'apps/docs');
const packageManifest = JSON.parse(
  await readFile(join(repositoryRoot, 'packages/mui-phone-input/package.json'), 'utf8'),
);

async function collectFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === '.next' || entry.name === 'node_modules') {
      continue;
    }
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (/\.(?:ts|tsx|css|json)$/u.test(entry.name)) {
      files.push(path);
    }
  }
  return files;
}

const sourceFiles = await collectFiles(docsRoot);
const sources = new Map(
  await Promise.all(
    sourceFiles.map(async (file) => [file, await readFile(file, 'utf8')]),
  ),
);
const allSource = [...sources.values()].join('\n');

const packageImportPattern =
  /(?:from\s+|import\s+)['"](@wh1teee\/mui-phone-input(?:\/[^'"]+)?)['"]/gu;
const packageImports = new Set();
for (const [file, source] of sources) {
  for (const match of source.matchAll(packageImportPattern)) {
    const specifier = match[1];
    packageImports.add(specifier);
    const exportKey =
      specifier === '@wh1teee/mui-phone-input'
        ? '.'
        : `.${specifier.slice('@wh1teee/mui-phone-input'.length)}`;
    assert.ok(
      Object.hasOwn(packageManifest.exports, exportKey),
      `${relative(repositoryRoot, file)} imports unpublished package subpath ${specifier}`,
    );
  }
}

for (const requiredImport of [
  '@wh1teee/mui-phone-input',
  '@wh1teee/mui-phone-input/server',
  '@wh1teee/mui-phone-input/react-hook-form',
  '@wh1teee/mui-phone-input/zod',
  '@wh1teee/mui-phone-input/locales/ru',
  '@wh1teee/mui-phone-input/flags.css',
  '@wh1teee/mui-phone-input/shadcn',
  '@wh1teee/mui-phone-input/shadcn.css',
]) {
  assert.ok(packageImports.has(requiredImport), `Docs must consume ${requiredImport}.`);
}

assert.doesNotMatch(
  allSource,
  /(?:from\s+|import\s+)['"]libphonenumber-js(?:\/[^'"]*)?['"]/u,
  'The docs app must not add a second libphonenumber-js authority.',
);
assert.doesNotMatch(
  allSource,
  /@wh1teee\/mui-phone-input\/src\//u,
  'The docs app must use published package entrypoints, not source deep imports.',
);

for (const requiredPhrase of [
  'Phone Value and Display Value',
  'Selected, detected, and resolved country',
  'Extensions and RFC 3966',
  'Country Selector',
  'Flags, localization, and RTL',
  'Material UI integration',
  'Forms: React Hook Form and Zod',
  'SSR, privacy, and security',
  'Metadata presets and freshness',
  'Performance budgets and selector calibration',
  'Accessibility contract',
  'Base UI and shadcn',
  'getPopularPhoneCountries',
  '33,506 bytes',
  '10,240 bytes',
  'react-phone-number-input',
  'intl-tel-input',
  'react-international-phone',
  'mui-tel-input',
  'react-phone-input-2',
  'From hand-rolled account and checkout fields',
  'CompiledCoreExample',
  'compiledServerExample',
]) {
  // Source formatting may wrap a phrase across lines.
  const pattern = requiredPhrase.replaceAll('.', '\\.').replaceAll(' ', '\\s+');
  assert.match(
    allSource,
    new RegExp(pattern, 'u'),
    `Docs must mention: ${requiredPhrase}`,
  );
}

assert.doesNotMatch(
  allSource,
  /\b(?:iOS|Android|VoiceOver|NVDA|JAWS)\s+(?:has\s+)?passed\b/iu,
  'Physical-device/AT evidence must not be documented as passed.',
);
assert.doesNotMatch(
  allSource,
  /release-candidate channel is live|@wh1teee\/mui-phone-input@next/iu,
  'Stable docs must not direct new users to the historical prerelease channel.',
);
assert.match(allSource, /docs\s+follow\s+current\s+source/iu);
assert.match(allSource, /registry\s+remains\s+authoritative/iu);
assert.match(allSource, /documented\s+residual\s+gaps/iu);
assert.match(allSource, /provenance/iu);

console.log(
  `Documentation contract verified across ${sourceFiles.length} files and ${packageImports.size} package entrypoints.`,
);
