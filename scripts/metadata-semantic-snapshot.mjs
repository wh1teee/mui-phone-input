import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { getExampleNumber } from 'libphonenumber-js/core';
import mobileExamples from 'libphonenumber-js/examples.mobile.json';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const corpus = JSON.parse(
  await readFile(
    join(repositoryRoot, 'tests/fixtures/metadata-golden-corpus.json'),
    'utf8',
  ),
);
const packageManifest = JSON.parse(
  await readFile(
    join(repositoryRoot, 'node_modules/libphonenumber-js/package.json'),
    'utf8',
  ),
);
const server = await import(
  `${pathToFileURL(join(repositoryRoot, 'packages/mui-phone-input/dist/server.js')).href}?snapshot=${Date.now()}`
);

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const outputPath = argument('output');
if (!outputPath) {
  throw new Error('Usage: metadata-semantic-snapshot --output=<json>');
}

const presetPaths = {
  max: 'max.js',
  min: 'min.js',
  mobile: 'mobile.js',
};
const presets = {};

for (const [presetName, filename] of Object.entries(presetPaths)) {
  const module = await import(
    `${pathToFileURL(join(repositoryRoot, 'packages/mui-phone-input/dist/metadata', filename)).href}?snapshot=${Date.now()}`
  );
  const metadata = module.default;
  const numbers = {};

  for (const candidate of corpus.numbers) {
    const validation = server.validatePhoneValue(candidate.value, { metadata });
    const numberingPlan = server.resolveNumberingPlan(candidate.value, { metadata });
    numbers[candidate.id] = {
      numberType: validation.numberType,
      possibility: validation.isPossible,
      possibleCountries: numberingPlan.possibleCountries,
      resolvedCountry: numberingPlan.resolvedCountry,
      strictValidity: validation.isValid,
    };
  }

  const examples = {};
  for (const country of corpus.exampleCountries) {
    examples[country] =
      getExampleNumber(country, mobileExamples, metadata)?.number ?? null;
  }

  presets[presetName] = { examples, numbers };
}

const snapshot = {
  generatedFrom: 'tests/fixtures/metadata-golden-corpus.json',
  presets,
  version: packageManifest.version,
};

await writeFile(resolve(outputPath), `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(
  `Metadata semantic snapshot written for libphonenumber-js ${snapshot.version}.`,
);
