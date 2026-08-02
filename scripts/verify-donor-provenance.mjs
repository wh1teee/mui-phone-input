import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const manifest = JSON.parse(await readFile('donors/manifest.json', 'utf8'));
const donorDocument = await readFile('DONORS.md', 'utf8');
const corpusSource = await Promise.all([
  readFile('tests/corpus/input-transactions.ts', 'utf8'),
  readFile('tests/corpus/country-selector.ts', 'utf8'),
  readFile('tests/corpus/christofle.ts', 'utf8'),
]).then((files) => files.join('\n'));

assert.equal(manifest.schemaVersion, 1);
assert.ok(Array.isArray(manifest.donors));
assert.ok(Array.isArray(manifest.capabilities));
assert.ok(manifest.donors.length >= 14);

const donorIds = new Set();
for (const donor of manifest.donors) {
  assert.match(donor.id, /^[a-z0-9-]+$/u);
  assert.ok(!donorIds.has(donor.id), `Duplicate donor ${donor.id}`);
  donorIds.add(donor.id);
  assert.ok([1, 2].includes(donor.tier));
  assert.match(donor.revision, /^[a-f0-9]{40}$/u);
  assert.ok(donor.release.length > 0);
  assert.ok(donor.license.length > 0);
  assert.ok(donor.source.length > 0);
  assert.ok(donor.inspectedSymbols.length > 0);
  assert.ok(donor.inspectedTests.length > 0);
  assert.ok(donor.knownIssues.length > 0);
  assert.match(donorDocument, new RegExp(donor.revision, 'u'));
}

const decisions = new Set(['copy', 'adapt', 'pattern-only', 'reject']);
for (const capability of manifest.capabilities) {
  assert.ok(capability.id.length > 0);
  assert.ok(capability.donors.length > 0);
  assert.ok(capability.donors.every((id) => donorIds.has(id)));
  assert.ok(decisions.has(capability.decision));
  assert.ok(capability.symbols.length > 0);
  assert.ok(capability.knownIssues.length > 0);
  assert.ok(capability.localRegressionCoverage.length > 0);
  assert.ok(capability.reason.length > 0);
  assert.ok(capability.licenseAction.length > 0);
  assert.match(donorDocument, new RegExp(capability.id, 'u'));
  for (const scenarioId of capability.localRegressionCoverage) {
    assert.match(corpusSource, new RegExp(`['"]${scenarioId}['"]`, 'u'));
  }
}

console.log('Donor provenance verified.');
