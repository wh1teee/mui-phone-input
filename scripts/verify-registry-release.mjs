import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
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

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: process.env,
    shell: false,
    ...options,
  });
  if (result.stdout && !options.capture) {
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
  return result.stdout ?? '';
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const candidate = JSON.parse(
  await readFile(join(candidateDirectory, 'candidate.json'), 'utf8'),
);
const specifier = `${candidate.package.name}@${candidate.package.version}`;
const registryMetadata = JSON.parse(
  run('npm', ['view', specifier, '--json'], { capture: true }),
);
const distTags = JSON.parse(
  run('npm', ['view', candidate.package.name, 'dist-tags', '--json'], {
    capture: true,
  }),
);
assert.equal(registryMetadata.name, candidate.package.name);
assert.equal(registryMetadata.version, candidate.package.version);
assert.equal(distTags.next, candidate.package.version);
assert.notEqual(
  distTags.latest,
  candidate.package.version,
  'The early canary must never be promoted to latest.',
);

const temporaryRoot = await mkdtemp(join(tmpdir(), 'mui-phone-input-registry-'));
try {
  const packDirectory = join(temporaryRoot, 'pack');
  await mkdir(packDirectory, { recursive: true });
  await writeFile(
    join(temporaryRoot, 'package.json'),
    `${JSON.stringify(
      {
        name: 'mui-phone-input-registry-verifier',
        version: '0.0.0',
        private: true,
        type: 'module',
        dependencies: {
          [candidate.package.name]: candidate.package.version,
        },
      },
      null,
      2,
    )}\n`,
  );
  run('npm', ['pack', specifier, '--pack-destination', packDirectory], {
    cwd: temporaryRoot,
  });
  const downloadedTarballs = (await readdir(packDirectory)).filter((file) =>
    file.endsWith('.tgz'),
  );
  assert.equal(downloadedTarballs.length, 1);
  const downloadedTarball = join(packDirectory, downloadedTarballs[0]);
  const downloadedSha256 = sha256(await readFile(downloadedTarball));
  assert.equal(
    downloadedSha256,
    candidate.artifact.sha256,
    'The registry tarball must be byte-identical to the reviewed candidate.',
  );

  run('npm', ['install', '--ignore-scripts', '--package-lock=true'], {
    cwd: temporaryRoot,
  });
  const signatureAudit = JSON.parse(
    run('npm', ['audit', 'signatures', '--json', '--include-attestations'], {
      capture: true,
      cwd: temporaryRoot,
    }),
  );
  const serializedAudit = JSON.stringify(signatureAudit);
  assert.match(serializedAudit, /verified/iu);
  assert.match(serializedAudit, /mui-phone-input/iu);
  assert.match(
    serializedAudit,
    new RegExp(candidate.package.version.replaceAll('.', '\\.'), 'u'),
  );

  await writeFile(
    join(temporaryRoot, 'probe.mjs'),
    `import assert from 'node:assert/strict';
import { MuiPhoneInput } from '@whiteee/mui-phone-input';
import { isPhoneValue } from '@whiteee/mui-phone-input/server';

assert.equal(typeof MuiPhoneInput, 'function');
assert.equal(isPhoneValue('+37529'), true);
console.log('Registry package imports verified.');
`,
  );
  run(process.execPath, ['probe.mjs'], { cwd: temporaryRoot });

  await writeFile(
    join(candidateDirectory, 'registry.json'),
    `${JSON.stringify({ distTags, version: registryMetadata }, null, 2)}\n`,
  );
  await writeFile(
    join(candidateDirectory, 'provenance-audit.json'),
    `${JSON.stringify(signatureAudit, null, 2)}\n`,
  );
  await writeFile(
    join(candidateDirectory, 'registry-tarball-sha256.txt'),
    `${downloadedSha256}  ${downloadedTarballs[0]}\n`,
  );
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
}

console.log(
  `Registry release ${specifier} verified with provenance and exact artifact parity.`,
);
