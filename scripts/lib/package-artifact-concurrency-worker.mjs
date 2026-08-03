import assert from 'node:assert/strict';
import { readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createPackageArtifact, releasePackageArtifact } from './package-artifact.mjs';

const [workerId, coordinationDirectory] = process.argv.slice(2);
assert.ok(workerId, 'Expected a worker identifier.');
assert.ok(coordinationDirectory, 'Expected a coordination directory.');

const tarball = await createPackageArtifact();

await stat(tarball);
await writeFile(
  join(coordinationDirectory, `${workerId}.ready.json`),
  `${JSON.stringify({ tarball }, null, 2)}\n`,
);

const releasePath = join(coordinationDirectory, `${workerId}.release`);
for (;;) {
  try {
    await readFile(releasePath);
    break;
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') {
      throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

try {
  await stat(tarball);
} finally {
  await releasePackageArtifact(tarball);
}
