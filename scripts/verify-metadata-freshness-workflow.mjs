import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const workflow = await readFile(
  join(repositoryRoot, '.github/workflows/metadata-freshness.yml'),
  'utf8',
);
const documentation = await readFile(
  join(repositoryRoot, 'docs/metadata-freshness.md'),
  'utf8',
);

for (const required of [
  'schedule:',
  'workflow_dispatch:',
  'permissions:',
  'contents: write',
  'pull-requests: write',
  'pnpm metadata:snapshot',
  'pnpm metadata:semantic-diff',
  'docs/metadata-freshness-latest.md',
  '.changeset/metadata-freshness.md',
  'gh pr create',
  'Human review is mandatory',
  'must never be auto-merged',
]) {
  assert.match(
    workflow,
    new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&'), 'u'),
  );
}

for (const forbidden of [
  'gh pr merge',
  '--auto',
  'enablePullRequestAutoMerge',
  'pull_request_target',
]) {
  assert.doesNotMatch(workflow, new RegExp(forbidden, 'u'));
}

assert.match(documentation, /stale metadata/iu);
assert.match(documentation, /rollback/iu);
assert.match(documentation, /possible/iu);
assert.match(documentation, /strict validity/iu);
assert.match(documentation, /human review/iu);

console.log('Scheduled metadata freshness workflow and human-review policy verified.');
