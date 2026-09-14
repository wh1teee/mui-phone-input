import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const AUTOMATION_AUTHOR_EMAIL =
  '41898282+github-actions[bot]@users.noreply.github.com';

export const METADATA_REVIEW_FILES = Object.freeze([
  '.changeset/metadata-freshness.md',
  'docs/metadata-freshness-latest.md',
  'package.json',
  'packages/mui-phone-input/package.json',
  'pnpm-lock.yaml',
]);

const METADATA_REVIEW_FILE_SET = new Set(METADATA_REVIEW_FILES);

export function metadataFreshnessBranch(version) {
  assert.match(
    version,
    /^\d+\.\d+\.\d+$/u,
    `Expected a stable libphonenumber-js version, received ${version}.`,
  );
  return `automation/metadata-freshness-${version}`;
}

export function existingReviewDisposition(pullRequests) {
  assert.ok(Array.isArray(pullRequests), 'Pull request response must be an array.');

  const open = pullRequests.find((pullRequest) => pullRequest.state === 'OPEN');
  if (open) {
    return { action: 'reuse-open', pullRequest: open };
  }

  const finished = pullRequests[0];
  if (finished) {
    return { action: 'respect-finished', pullRequest: finished };
  }

  return { action: 'create' };
}

export function validateAutomationOwnedBranch({ authors, changedPaths }) {
  assert.ok(
    authors.length > 0,
    'An orphan metadata branch without automation-authored commits is not safe to replace.',
  );
  assert.deepEqual(
    [...new Set(authors)],
    [AUTOMATION_AUTHOR_EMAIL],
    'An orphan metadata branch contains a non-automation commit and must not be replaced.',
  );

  const unexpectedPaths = changedPaths.filter(
    (changedPath) => !METADATA_REVIEW_FILE_SET.has(changedPath),
  );
  assert.deepEqual(
    unexpectedPaths,
    [],
    `An orphan metadata branch changes files outside the generated review contract: ${unexpectedPaths.join(', ')}`,
  );
}

function command(commandName, args, { allowStatuses = [0] } = {}) {
  const result = spawnSync(commandName, args, {
    encoding: 'utf8',
    env: process.env,
    shell: false,
  });
  if (!allowStatuses.includes(result.status)) {
    throw new Error(
      `${commandName} ${args.join(' ')} failed with status ${result.status}.\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
    );
  }
  return result;
}

function output(commandName, args) {
  return command(commandName, args).stdout.trim();
}

function remoteBranchOid(branch) {
  const result = command(
    'git',
    ['ls-remote', '--exit-code', '--heads', 'origin', `refs/heads/${branch}`],
    { allowStatuses: [0, 2] },
  );
  if (result.status === 2) return undefined;
  return result.stdout.trim().split(/\s+/u)[0];
}

function splitLines(value) {
  return value ? value.split(/\r?\n/u).filter(Boolean) : [];
}

export function openMetadataFreshnessPullRequest({ latest }) {
  const branch = metadataFreshnessBranch(latest);
  const pullRequests = JSON.parse(
    output('gh', [
      'pr',
      'list',
      '--state',
      'all',
      '--head',
      branch,
      '--limit',
      '20',
      '--json',
      'number,state,url',
    ]),
  );
  const disposition = existingReviewDisposition(pullRequests);

  if (disposition.action !== 'create') {
    const { number, state, url } = disposition.pullRequest;
    console.log(
      `Metadata review PR #${number} is already ${state.toLowerCase()}: ${url}. No branch mutation performed.`,
    );
    return { action: disposition.action, branch, url };
  }

  const remoteOid = remoteBranchOid(branch);
  if (remoteOid) {
    const remoteRef = `refs/remotes/origin/${branch}`;
    command('git', [
      'fetch',
      '--no-tags',
      'origin',
      `+refs/heads/${branch}:${remoteRef}`,
    ]);
    const mergeBase = output('git', ['merge-base', 'HEAD', remoteRef]);
    validateAutomationOwnedBranch({
      authors: splitLines(
        output('git', ['log', '--format=%ae', `${mergeBase}..${remoteRef}`]),
      ),
      changedPaths: splitLines(
        output('git', ['diff', '--name-only', `${mergeBase}..${remoteRef}`]),
      ),
    });
  }

  command('git', ['config', 'user.name', 'github-actions[bot]']);
  command('git', ['config', 'user.email', AUTOMATION_AUTHOR_EMAIL]);
  command('git', ['switch', '-C', branch]);
  command('git', ['add', ...METADATA_REVIEW_FILES]);

  const stagedDiff = command('git', ['diff', '--cached', '--quiet'], {
    allowStatuses: [0, 1],
  });
  assert.equal(
    stagedDiff.status,
    1,
    'Metadata update was requested but generated no reviewable branch changes.',
  );
  command('git', ['commit', '-m', `chore: refresh phone metadata to ${latest}`]);

  const pushArgs = ['push', '--set-upstream'];
  if (remoteOid) {
    pushArgs.push(`--force-with-lease=refs/heads/${branch}:${remoteOid}`);
  }
  pushArgs.push('origin', `HEAD:refs/heads/${branch}`);
  command('git', pushArgs);

  const url = output('gh', [
    'pr',
    'create',
    '--base',
    'main',
    '--head',
    branch,
    '--title',
    `chore: refresh phone metadata to ${latest}`,
    '--body-file',
    '.metadata-freshness/pr-body.md',
  ]);
  console.log(`Opened metadata freshness review: ${url}`);
  return { action: remoteOid ? 'replace-orphan-and-create' : 'create', branch, url };
}

const isEntrypoint =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isEntrypoint) {
  const latest = process.env.LATEST;
  assert.ok(latest, 'LATEST is required.');
  openMetadataFreshnessPullRequest({ latest });
}
