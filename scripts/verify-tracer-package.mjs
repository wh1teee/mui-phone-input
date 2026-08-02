import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { measureTracerPackage } from './lib/tracer-package-measurement.mjs';

const expected = JSON.parse(
  await readFile('docs/research/2026-08-02-tracer-package-budget.json', 'utf8'),
);
const evidence = await readFile(
  'docs/research/2026-08-02-minimal-tracer-evidence.md',
  'utf8',
);
const actual = await measureTracerPackage();

assert.deepEqual(actual, expected);
assert.equal(actual.status, 'pass');
assert.ok(actual.main.gzipBytes <= actual.budgets.mainGzipBytes);
assert.ok(actual.server.gzipBytes <= actual.budgets.serverGzipBytes);

const formatNumber = (value) => new Intl.NumberFormat('en-US').format(value);
for (const value of [
  actual.main.gzipBytes,
  actual.server.gzipBytes,
  actual.tarballBytes,
]) {
  assert.match(evidence, new RegExp(formatNumber(value), 'u'));
}

console.log('Tracer package budget verified.');
