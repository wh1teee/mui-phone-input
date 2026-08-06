import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = join(repositoryRoot, 'packages/mui-phone-input/dist');
const corpus = JSON.parse(
  await readFile(
    join(repositoryRoot, 'tests/fixtures/metadata-golden-corpus.json'),
    'utf8',
  ),
);
const client = await import(
  `${pathToFileURL(join(distRoot, 'index.js')).href}?parity=client`
);
const server = await import(
  `${pathToFileURL(join(distRoot, 'server.js')).href}?parity=server`
);

for (const preset of ['max', 'min', 'mobile']) {
  const metadataModule = await import(
    `${pathToFileURL(join(distRoot, 'metadata', `${preset}.js`)).href}?parity=${preset}`
  );
  const metadata = metadataModule.default;

  for (const candidate of corpus.numbers) {
    const options = { metadata };
    assert.deepEqual(
      client.validatePhoneValue(candidate.value, options),
      server.validatePhoneValue(candidate.value, options),
      `${preset} client/server validation diverged for ${candidate.id}`,
    );
    assert.deepEqual(
      client.resolveNumberingPlan(candidate.value, options),
      server.resolveNumberingPlan(candidate.value, options),
      `${preset} client/server numbering-plan resolution diverged for ${candidate.id}`,
    );
    assert.equal(
      client.formatPhoneValueForDisplay(candidate.value, metadata),
      server.formatPhoneValueForDisplay(candidate.value, metadata),
      `${preset} client/server formatting diverged for ${candidate.id}`,
    );
  }

  assert.ok(
    client.createPhoneCountryOptions({ metadata }).length > 0,
    `${preset} country options must come from the selected metadata authority.`,
  );
}

assert.equal(client.validatePhoneValue('+375291234567').mode, 'possible');
assert.equal(server.validatePhoneValue('+375291234567').mode, 'possible');
assert.throws(
  () =>
    server.validatePhoneMetadata({
      version: 4,
      country_calling_codes: {},
      countries: null,
    }),
  TypeError,
);

for (const entry of ['custom', 'max', 'min', 'mobile']) {
  const source = await readFile(join(distRoot, 'metadata', `${entry}.js`), 'utf8');
  for (const forbidden of [
    'react',
    '@mui/',
    '@emotion/',
    'react-dom',
    'document',
    'window',
  ]) {
    assert.doesNotMatch(source, new RegExp(forbidden.replace('/', '\\/'), 'u'));
  }
}

console.log(
  'Metadata preset client/server parity and neutral dependency boundaries verified.',
);
