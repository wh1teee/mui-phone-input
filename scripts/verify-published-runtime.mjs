import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const expectedMajorArgument = process.argv.find((argument) =>
  argument.startsWith('--expected-major='),
);
const expectedMajor = expectedMajorArgument?.split('=', 2)[1];
const actualMajor = process.versions.node.split('.', 1)[0];
const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);

assert.ok(expectedMajor, 'Pass --expected-major=<major>.');
assert.equal(
  actualMajor,
  expectedMajor,
  `Expected Node ${expectedMajor}, received ${process.version}.`,
);

function run(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    env: process.env,
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
      `${command} ${args.join(' ')} failed with status ${result.status ?? 'unknown'}.`,
    );
  }
}

let releaseOwnedArtifact = async () => undefined;
let tarball;
let consumerDirectory;

try {
  if (artifactArgument) {
    tarball = resolve(artifactArgument.split('=', 2)[1] ?? '');
  } else {
    const { createPackageArtifact, releasePackageArtifact } = await import(
      './lib/package-artifact.mjs'
    );
    tarball = await createPackageArtifact();
    releaseOwnedArtifact = () => releasePackageArtifact(tarball);
  }
  assert.equal(typeof tarball, 'string');
  assert.ok(tarball.endsWith('.tgz'), 'Expected an exact package tarball.');
  await readFile(tarball);

  const rootPackage = JSON.parse(
    await readFile(join(repositoryRoot, 'package.json'), 'utf8'),
  );
  consumerDirectory = await mkdtemp(
    join(tmpdir(), `mui-phone-input-node-${expectedMajor}-`),
  );

  await writeFile(
    join(consumerDirectory, 'package.json'),
    `${JSON.stringify(
      {
        name: `mui-phone-input-node-${expectedMajor}-consumer`,
        version: '0.0.0',
        private: true,
        type: 'module',
        packageManager: rootPackage.packageManager,
        dependencies: {
          '@emotion/react': rootPackage.devDependencies['@emotion/react'],
          '@emotion/styled': rootPackage.devDependencies['@emotion/styled'],
          '@mui/material': '9.0.0',
          '@whiteee/mui-phone-input': `file:${tarball}`,
          react: '19.0.0',
          'react-dom': '19.0.0',
        },
        devDependencies: {
          '@types/react': rootPackage.devDependencies['@types/react'],
          '@types/react-dom': rootPackage.devDependencies['@types/react-dom'],
        },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(consumerDirectory, '.npmrc'),
    'auto-install-peers=false\nengine-strict=true\nignore-scripts=true\nstrict-peer-dependencies=true\n',
  );
  await writeFile(
    join(consumerDirectory, 'probe.mjs'),
    `import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const manifest = JSON.parse(
  await readFile(
    fileURLToPath(import.meta.resolve('@whiteee/mui-phone-input/package.json')),
    'utf8',
  ),
);
const client = await import('@whiteee/mui-phone-input');
const server = await import('@whiteee/mui-phone-input/server');

assert.equal(manifest.engines, undefined);
assert.equal(typeof client.MuiPhoneInput, 'function');
assert.equal(server.isPhoneValue('+37529'), true);
assert.equal(server.isPhoneValue('37529'), false);
assert.deepEqual(Object.keys(server).sort(), [
  'assertPhoneValue',
  'formatPhoneValueForDisplay',
  'isPhoneValue',
  'parsePhoneValue',
  'resolveNumberingPlan',
  'validatePhoneValue',
]);

console.log(JSON.stringify({ node: process.version, package: manifest.name }));
`,
  );

  run('pnpm', ['install', '--frozen-lockfile=false'], consumerDirectory);
  run(process.execPath, ['probe.mjs'], consumerDirectory);
} finally {
  try {
    if (consumerDirectory) {
      await rm(consumerDirectory, { force: true, recursive: true });
    }
  } finally {
    await releaseOwnedArtifact();
  }
}

console.log(`Published package runtime verified on ${process.version}.`);
