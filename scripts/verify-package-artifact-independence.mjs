import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { artifactsDirectory, repositoryRoot } from './lib/package-artifact.mjs';

const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);
assert.ok(artifactArgument, 'Pass --artifact=<package-tarball>.');
const tarball = resolve(artifactArgument.slice('--artifact='.length));

function verifyArtifact(artifact) {
  return spawnSync(
    process.execPath,
    ['scripts/verify-package.mjs', `--artifact=${artifact}`],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: process.env,
      shell: false,
    },
  );
}

function failureDetails(result) {
  return [result.error?.message, result.stderr, result.stdout]
    .filter(Boolean)
    .join('\n')
    .trim();
}

await mkdir(artifactsDirectory, { recursive: true });
const distRoot = join(repositoryRoot, 'packages/mui-phone-input/dist');
const distBackup = join(
  repositoryRoot,
  'packages/mui-phone-input/.dist-artifact-independence-backup',
);
await rm(distBackup, { force: true, recursive: true });
await rename(distRoot, distBackup);
try {
  await mkdir(distRoot, { recursive: true });
  await writeFile(
    join(distRoot, 'index.js'),
    'throw new Error("divergent local dist must never be inspected");\n',
  );
  await writeFile(
    join(distRoot, 'server.js'),
    'throw new Error("divergent local dist must never be inspected");\n',
  );

  const result = verifyArtifact(tarball);
  assert.equal(
    result.status,
    0,
    `Valid artifact verification depended on divergent local dist:\n${failureDetails(result)}`,
  );
} finally {
  await rm(distRoot, { force: true, recursive: true });
  await rename(distBackup, distRoot);
}

const mutationRoot = await mkdtemp(join(artifactsDirectory, 'mutated-package-'));
try {
  const extractedRoot = join(mutationRoot, 'extracted');
  const mutatedTarball = join(mutationRoot, 'mutated.tgz');
  await mkdir(extractedRoot, { recursive: true });
  const extractResult = spawnSync('tar', ['-xzf', tarball, '-C', extractedRoot], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    shell: false,
  });
  assert.equal(extractResult.status, 0, failureDetails(extractResult));
  await rm(join(extractedRoot, 'package/dist/server.js'));
  const packResult = spawnSync(
    'tar',
    ['-czf', mutatedTarball, '-C', extractedRoot, 'package'],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      shell: false,
    },
  );
  assert.equal(packResult.status, 0, failureDetails(packResult));

  const result = verifyArtifact(mutatedTarball);
  assert.notEqual(
    result.status,
    0,
    'Artifact verification must fail closed when a required packed file is missing.',
  );
} finally {
  await rm(mutationRoot, { force: true, recursive: true });
}

console.log(
  'Package verifier artifact independence and fail-closed mutation verified.',
);
