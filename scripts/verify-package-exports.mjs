import { createPackageArtifact } from './lib/package-artifact.mjs';
import { verifyPackageExportContract } from './lib/package-export-contract.mjs';

const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);
const tarball = artifactArgument
  ? artifactArgument.slice('--artifact='.length)
  : await createPackageArtifact();

await verifyPackageExportContract(tarball);
