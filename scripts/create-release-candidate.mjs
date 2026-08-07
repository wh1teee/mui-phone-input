import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  createPackageArtifact,
  releasePackageArtifact,
} from './lib/package-artifact.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputArgument = process.argv.find((argument) =>
  argument.startsWith('--output-dir='),
);
const outputDirectory = resolve(
  repositoryRoot,
  outputArgument?.slice('--output-dir='.length) ?? '.artifacts/release-candidate',
);

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: process.env,
    shell: false,
    ...options,
  });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status ?? 'unknown'}.`,
    );
  }
  return result;
}

function git(...args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
}

function readPackedFile(tarball, path) {
  return execFileSync('tar', ['-xOf', tarball, `package/${path}`], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  });
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const sourceStatus = git('status', '--porcelain');
assert.equal(
  sourceStatus,
  '',
  'Release candidates must be created from a clean committed checkout.',
);

const sourceCommit = git('rev-parse', 'HEAD');
const sourceTree = git('rev-parse', 'HEAD^{tree}');
const packageManifest = JSON.parse(
  await readFile(join(repositoryRoot, 'packages/mui-phone-input/package.json'), 'utf8'),
);
assert.equal(packageManifest.name, '@wh1teee/mui-phone-input');
assert.match(
  packageManifest.version,
  /^0\.1\.0-next\.\d+$/u,
  'Feature-complete RC must use the existing 0.1.0-next.x prerelease channel.',
);
assert.deepEqual(packageManifest.publishConfig, {
  access: 'public',
  provenance: true,
  tag: 'next',
});

await rm(outputDirectory, { force: true, recursive: true });
await mkdir(outputDirectory, { recursive: true });

const ownedTarball = await createPackageArtifact();
try {
  const tarballName = `wh1teee-mui-phone-input-${packageManifest.version}.tgz`;
  const tarball = join(outputDirectory, tarballName);
  await copyFile(ownedTarball, tarball);

  const packedManifestSource = readPackedFile(tarball, 'package.json');
  const packedManifest = JSON.parse(packedManifestSource);
  assert.equal(packedManifest.name, packageManifest.name);
  assert.equal(packedManifest.version, packageManifest.version);
  assert.deepEqual(packedManifest.publishConfig, packageManifest.publishConfig);
  await writeFile(
    join(outputDirectory, 'package-manifest.json'),
    `${JSON.stringify(packedManifest, null, 2)}\n`,
  );

  for (const file of ['LICENSE', 'README.md', 'THIRD_PARTY_NOTICES.md']) {
    await writeFile(join(outputDirectory, file), readPackedFile(tarball, file));
  }

  const releaseNotes = await readFile(
    join(repositoryRoot, 'docs/releases/feature-complete-rc.md'),
    'utf8',
  );
  const rollback = await readFile(
    join(repositoryRoot, 'docs/releases/rollback-feature-complete-rc.md'),
    'utf8',
  );
  await writeFile(
    join(outputDirectory, 'RELEASE_NOTES.md'),
    `# ${packageManifest.name} ${packageManifest.version}\n\n` +
      `Source commit: \`${sourceCommit}\`\n\n` +
      `Source tree: \`${sourceTree}\`\n\n` +
      `${releaseNotes.trim()}\n`,
  );
  await writeFile(
    join(outputDirectory, 'ROLLBACK.md'),
    `# Rollback ${packageManifest.name} ${packageManifest.version}\n\n${rollback.trim()}\n`,
  );

  const sbomPath = join(outputDirectory, 'sbom.cdx.json');
  run('pnpm', [
    '--filter',
    packageManifest.name,
    'sbom',
    '--prod',
    '--exclude-peers',
    '--sbom-format',
    'cyclonedx',
    '--sbom-type',
    'library',
    '--sbom-supplier',
    'Konstantsin Petrovskiy',
    '--out',
    sbomPath,
  ]);
  const sbom = JSON.parse(await readFile(sbomPath, 'utf8'));
  assert.equal(sbom.bomFormat, 'CycloneDX');
  assert.equal(sbom.metadata?.component?.group, '@wh1teee');
  assert.equal(sbom.metadata?.component?.name, 'mui-phone-input');
  assert.equal(sbom.metadata?.component?.version, packageManifest.version);

  const tarballContent = await readFile(tarball);
  const candidate = {
    schemaVersion: 1,
    package: {
      name: packageManifest.name,
      version: packageManifest.version,
    },
    publication: {
      access: 'public',
      distTag: 'next',
      provenance: true,
      releaseTag: `v${packageManifest.version}`,
      workflow: '.github/workflows/release.yml',
    },
    source: {
      commit: sourceCommit,
      repository: 'wh1teee/mui-phone-input',
      tree: sourceTree,
    },
    artifact: {
      bytes: (await stat(tarball)).size,
      filename: tarballName,
      sha256: sha256(tarballContent),
    },
    evidence: [
      'LICENSE',
      'package-manifest.json',
      'README.md',
      'RELEASE_NOTES.md',
      'ROLLBACK.md',
      'sbom.cdx.json',
      'THIRD_PARTY_NOTICES.md',
    ],
  };
  await writeFile(
    join(outputDirectory, 'candidate.json'),
    `${JSON.stringify(candidate, null, 2)}\n`,
  );

  const evidenceFiles = (await readdir(outputDirectory))
    .filter((file) => file !== 'SHA256SUMS')
    .sort();
  const checksums = [];
  for (const file of evidenceFiles) {
    checksums.push(`${sha256(await readFile(join(outputDirectory, file)))}  ${file}`);
  }
  await writeFile(join(outputDirectory, 'SHA256SUMS'), `${checksums.join('\n')}\n`);
  await chmod(tarball, 0o444);

  console.log(
    JSON.stringify(
      {
        candidate: join(outputDirectory, 'candidate.json'),
        directory: outputDirectory,
        tarball,
        version: packageManifest.version,
      },
      null,
      2,
    ),
  );
} finally {
  await releasePackageArtifact(ownedTarball);
}
