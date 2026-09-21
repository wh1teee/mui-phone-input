import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createIsolatedProcessEnvironment } from './lib/isolated-process-environment.mjs';
import { createIsolatedTemporaryRoot } from './lib/isolated-temporary-root.mjs';
import { assertEarlyCanaryDistTags } from './lib/npm-dist-tags.mjs';
import {
  readRegistryJsonWithRetry,
  runRegistryCommandWithRetry,
} from './lib/npm-registry-retry.mjs';
import { createRegistryConsumerDependencies } from './lib/registry-consumer.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const isolatedProcessEnvironment = createIsolatedProcessEnvironment();
const directoryArgument = process.argv.find((argument) =>
  argument.startsWith('--directory='),
);
assert.ok(directoryArgument, 'Pass --directory=<release-candidate-directory>.');
const candidateDirectory = resolve(
  repositoryRoot,
  directoryArgument.slice('--directory='.length),
);

function run(command, args, options = {}) {
  const result = execute(command, args, options);
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

function execute(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: isolatedProcessEnvironment,
    shell: false,
    ...options,
  });
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

const candidate = JSON.parse(
  await readFile(join(candidateDirectory, 'candidate.json'), 'utf8'),
);
const specifier = `${candidate.package.name}@${candidate.package.version}`;
const registryMetadata = await readRegistryJsonWithRetry({
  // The next.9 registry read first became visible after the old 30s window.
  // Keep propagation retries bounded; auth/integrity errors still fail at once.
  attempts: 61,
  delayMs: 5_000,
  description: `npm view ${specifier} --json`,
  execute: () =>
    execute('npm', ['view', specifier, '--json', '--prefer-online'], {
      timeout: 30_000,
    }),
});
const distTags = await readRegistryJsonWithRetry({
  description: `npm view ${candidate.package.name} dist-tags --json`,
  execute: () =>
    execute('npm', ['view', candidate.package.name, 'dist-tags', '--json']),
});
assert.equal(registryMetadata.name, candidate.package.name);
assert.equal(registryMetadata.version, candidate.package.version);
assertEarlyCanaryDistTags(distTags, candidate.package.version);

const temporaryRoot = await createIsolatedTemporaryRoot('mui-phone-input-registry-', {
  forbiddenPackages: ['@wh1teee/mui-phone-input'],
});
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
        dependencies: createRegistryConsumerDependencies(registryMetadata),
      },
      null,
      2,
    )}\n`,
  );
  await runRegistryCommandWithRetry({
    description: `npm pack ${specifier}`,
    execute: () =>
      execute('npm', ['pack', specifier, '--pack-destination', packDirectory], {
        cwd: temporaryRoot,
        timeout: 30_000,
      }),
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
import { MuiPhoneInput } from '@wh1teee/mui-phone-input';
import { isPhoneValue } from '@wh1teee/mui-phone-input/server';

assert.equal(typeof MuiPhoneInput, 'function');
assert.equal(isPhoneValue('+37529'), true);
${
  registryMetadata.exports?.['./base-ui']
    ? `
const base = await import('@wh1teee/mui-phone-input/base-ui');
const headless = await import('@wh1teee/mui-phone-input/headless');
assert.equal(typeof base.PhoneInput, 'function');
assert.equal(typeof base.PhoneInputCountrySelector, 'function');
assert.equal(typeof headless.usePhoneInput, 'function');
`
    : ''
}
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
