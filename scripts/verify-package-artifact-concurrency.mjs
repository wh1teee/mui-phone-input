import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { artifactsDirectory, repositoryRoot } from './lib/package-artifact.mjs';

const coordinationDirectory = await mkdtemp(
  join(tmpdir(), 'mui-phone-input-artifact-concurrency-'),
);
await mkdir(artifactsDirectory, { recursive: true });
const siblingArtifactDirectory = await mkdtemp(
  join(artifactsDirectory, 'run-sibling-'),
);
const siblingEvidencePath = join(siblingArtifactDirectory, 'evidence.txt');
await writeFile(siblingEvidencePath, 'owned by another artifact consumer\n');
const workerPath = join(
  repositoryRoot,
  'scripts/lib/package-artifact-concurrency-worker.mjs',
);

function startWorker(workerId) {
  const child = spawn(process.execPath, [workerPath, workerId, coordinationDirectory], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => {
    output += chunk;
  });
  child.stderr.on('data', (chunk) => {
    output += chunk;
  });
  return { child, output: () => output, workerId };
}

async function waitForReady(worker) {
  const readyPath = join(coordinationDirectory, `${worker.workerId}.ready.json`);
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    if (worker.child.exitCode !== null) {
      throw new Error(
        `Artifact worker ${worker.workerId} exited before readiness.\n${worker.output()}`,
      );
    }
    try {
      return JSON.parse(await readFile(readyPath, 'utf8'));
    } catch (error) {
      if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
        throw error;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }

  throw new Error(`Artifact worker ${worker.workerId} did not become ready.`);
}

async function waitForExit(worker) {
  const exitCode =
    worker.child.exitCode ??
    (await new Promise((resolve, reject) => {
      worker.child.once('error', reject);
      worker.child.once('exit', resolve);
    }));
  assert.equal(
    exitCode,
    0,
    `Artifact worker ${worker.workerId} failed.\n${worker.output()}`,
  );
}

async function assertDirectoryRemoved(path) {
  try {
    await stat(path);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return;
    }
    throw error;
  }
  assert.fail(`Owned artifact directory was not cleaned: ${path}`);
}

const firstWorker = startWorker('first');
let secondWorker;
let verificationError;

try {
  const firstArtifact = await waitForReady(firstWorker);
  secondWorker = startWorker('second');
  const secondArtifact = await waitForReady(secondWorker);

  try {
    assert.notEqual(
      firstArtifact.tarball,
      secondArtifact.tarball,
      'Concurrent package consumers must not share a tarball path.',
    );
  } catch (error) {
    verificationError = error;
  } finally {
    await Promise.all([
      writeFile(join(coordinationDirectory, 'first.release'), ''),
      writeFile(join(coordinationDirectory, 'second.release'), ''),
    ]);
  }

  await Promise.all([waitForExit(firstWorker), waitForExit(secondWorker)]);
  await Promise.all([
    assertDirectoryRemoved(dirname(firstArtifact.tarball)),
    assertDirectoryRemoved(dirname(secondArtifact.tarball)),
  ]);
  assert.equal(
    await readFile(siblingEvidencePath, 'utf8'),
    'owned by another artifact consumer\n',
    'An artifact consumer removed evidence owned by another run.',
  );

  if (verificationError) {
    throw verificationError;
  }
  console.log('Concurrent package artifact ownership verified.');
} finally {
  firstWorker.child.kill('SIGTERM');
  secondWorker?.child.kill('SIGTERM');
  await Promise.all([
    rm(coordinationDirectory, { force: true, recursive: true }),
    rm(siblingArtifactDirectory, { force: true, recursive: true }),
  ]);
}
