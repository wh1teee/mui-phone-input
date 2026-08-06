import { resolve } from 'node:path';

import {
  createPackageArtifact,
  releasePackageArtifact,
  run,
} from './lib/package-artifact.mjs';

const suppliedArtifact = process.env.PACKAGE_ARTIFACT;
const tarball = suppliedArtifact
  ? resolve(suppliedArtifact)
  : await createPackageArtifact();

try {
  for (const args of [
    ['scripts/verify-package.mjs', `--artifact=${tarball}`],
    ['scripts/verify-package-artifact-independence.mjs', `--artifact=${tarball}`],
    [
      'scripts/verify-published-runtime.mjs',
      '--expected-major=24',
      `--artifact=${tarball}`,
    ],
    ['scripts/verify-tracer-package.mjs', `--artifact=${tarball}`],
    ['scripts/verify-packed-consumers.mjs', `--artifact=${tarball}`],
  ]) {
    run(process.execPath, args);
  }
} finally {
  if (!suppliedArtifact) {
    await releasePackageArtifact(tarball);
  }
}

console.log(
  'Package artifact verification suite passed against one immutable tarball.',
);
