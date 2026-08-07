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
  for (const [args, options] of [
    [['scripts/verify-package.mjs', `--artifact=${tarball}`]],
    [['scripts/verify-package-artifact-independence.mjs', `--artifact=${tarball}`]],
    [
      [
        'scripts/verify-published-runtime.mjs',
        '--expected-major=24',
        `--artifact=${tarball}`,
      ],
    ],
    [['scripts/verify-tracer-package.mjs', `--artifact=${tarball}`]],
    [['scripts/verify-packed-specialized-consumers.mjs', `--artifact=${tarball}`]],
    [
      ['scripts/verify-packed-consumers.mjs', `--artifact=${tarball}`],
      { env: { ...process.env, SUPPORT_MATRIX: 'latest' } },
    ],
    [
      ['scripts/verify-packed-consumers.mjs', `--artifact=${tarball}`],
      { env: { ...process.env, SUPPORT_MATRIX: 'minimum' } },
    ],
  ]) {
    run(process.execPath, args, options);
  }
} finally {
  if (!suppliedArtifact) {
    await releasePackageArtifact(tarball);
  }
}

console.log(
  'Package artifact verification suite passed against one immutable tarball.',
);
