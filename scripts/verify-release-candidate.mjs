import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const directoryArgument = process.argv.find((argument) =>
  argument.startsWith('--directory='),
);
assert.ok(directoryArgument, 'Pass --directory=<release-candidate-directory>.');
const candidateDirectory = resolve(
  repositoryRoot,
  directoryArgument.slice('--directory='.length),
);

function git(...args) {
  return execFileSync('git', args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }).trim();
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const candidate = JSON.parse(
  await readFile(join(candidateDirectory, 'candidate.json'), 'utf8'),
);
assert.equal(candidate.schemaVersion, 1);
assert.equal(candidate.package.name, '@wh1teee/mui-phone-input');
assert.match(candidate.package.version, /^0\.1\.0-next\.\d+$/u);
assert.equal(candidate.publication.access, 'public');
assert.equal(candidate.publication.distTag, 'next');
assert.equal(candidate.publication.provenance, true);
assert.equal(candidate.publication.releaseTag, `v${candidate.package.version}`);
assert.equal(candidate.publication.workflow, '.github/workflows/release.yml');
assert.equal(candidate.source.repository, 'wh1teee/mui-phone-input');
assert.equal(candidate.source.commit, git('rev-parse', 'HEAD'));
assert.equal(candidate.source.tree, git('rev-parse', 'HEAD^{tree}'));

if (process.argv.includes('--require-tag')) {
  assert.equal(
    process.env.GITHUB_REF_NAME,
    candidate.publication.releaseTag,
    'Release workflow must run from the exact candidate tag.',
  );
  assert.equal(process.env.GITHUB_REF_TYPE, 'tag');
}

const checksumLines = (await readFile(join(candidateDirectory, 'SHA256SUMS'), 'utf8'))
  .trim()
  .split('\n');
for (const line of checksumLines) {
  const match = line.match(/^([0-9a-f]{64})  (.+)$/u);
  assert.ok(match, `Malformed checksum line: ${line}`);
  const [, expected, file] = match;
  assert.equal(sha256(await readFile(join(candidateDirectory, file))), expected);
}

const tarball = join(candidateDirectory, candidate.artifact.filename);
const tarballContent = await readFile(tarball);
assert.equal(tarballContent.byteLength, candidate.artifact.bytes);
assert.equal(sha256(tarballContent), candidate.artifact.sha256);
const packedManifest = JSON.parse(
  execFileSync('tar', ['-xOf', tarball, 'package/package.json'], {
    cwd: repositoryRoot,
    encoding: 'utf8',
  }),
);
assert.deepEqual(
  packedManifest,
  JSON.parse(await readFile(join(candidateDirectory, 'package-manifest.json'), 'utf8')),
);
assert.equal(packedManifest.name, candidate.package.name);
assert.equal(packedManifest.version, candidate.package.version);
assert.deepEqual(packedManifest.publishConfig, {
  access: 'public',
  provenance: true,
  tag: 'next',
});
assert.deepEqual(Object.keys(packedManifest.exports).sort(), [
  '.',
  './flags',
  './flags.css',
  './locales/be',
  './locales/en',
  './locales/ru',
  './metadata/custom',
  './metadata/max',
  './metadata/min',
  './metadata/mobile',
  './package.json',
  './server',
]);

const sbom = JSON.parse(
  await readFile(join(candidateDirectory, 'sbom.cdx.json'), 'utf8'),
);
assert.equal(sbom.bomFormat, 'CycloneDX');
assert.equal(sbom.metadata?.component?.group, '@wh1teee');
assert.equal(sbom.metadata?.component?.name, 'mui-phone-input');
assert.equal(sbom.metadata?.component?.version, candidate.package.version);

const releaseNotes = await readFile(
  join(candidateDirectory, 'RELEASE_NOTES.md'),
  'utf8',
);
assert.match(releaseNotes, /intentionally narrow/iu);
assert.match(releaseNotes, /not[\s\S]*latest/iu);
assert.match(releaseNotes, /React Hook Form|RHF/u);
assert.match(releaseNotes, /metadata presets/iu);
const rollback = await readFile(join(candidateDirectory, 'ROLLBACK.md'), 'utf8');
assert.match(rollback, /npm deprecate/u);
assert.match(rollback, /dist-tag/u);
assert.match(rollback, /Do not rebuild/iu);

console.log(
  `Release candidate ${candidate.package.name}@${candidate.package.version} verified: ${candidate.artifact.sha256}.`,
);
