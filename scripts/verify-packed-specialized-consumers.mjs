import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import {
  createPackageArtifact,
  releasePackageArtifact,
  run,
} from './lib/package-artifact.mjs';

const artifactArgument = process.argv.find((argument) =>
  argument.startsWith('--artifact='),
);
const ownsArtifact = !artifactArgument;
const tarball = artifactArgument
  ? resolve(artifactArgument.slice('--artifact='.length))
  : await createPackageArtifact();
const temporaryRoot = await mkdtemp(join(tmpdir(), 'mui-phone-input-specialized-'));

async function sha256File(file) {
  return createHash('sha256')
    .update(await readFile(file))
    .digest('hex');
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

const authoritativeTarballDigest = await sha256File(tarball);

const profiles = [
  {
    absent: ['@mui/material', 'react', 'react-dom', 'react-hook-form', 'zod'],
    dependencies: {},
    expectedExports: [
      'assertPhoneExtension',
      'assertPhoneValue',
      'formatPhoneValueForDisplay',
      'isPhoneExtension',
      'isPhoneValue',
      'parseNationalPhoneValue',
      'parsePhoneExtension',
      'parsePhoneValue',
      'parseRfc3966',
      'resolveNumberingPlan',
      'serializeRfc3966',
      'validatePhoneMetadata',
      'validatePhoneValue',
    ],
    name: 'server-only',
    specifier: '@wh1teee/mui-phone-input/server',
  },
  {
    absent: ['zod'],
    dependencies: {
      '@emotion/react': '11.14.0',
      '@emotion/styled': '11.14.1',
      '@mui/material': '9.2.0',
      react: '19.2.8',
      'react-dom': '19.2.8',
      'react-hook-form': '7.83.0',
    },
    expectedExports: ['MuiPhoneInputController'],
    name: 'rhf-only',
    specifier: '@wh1teee/mui-phone-input/react-hook-form',
  },
  {
    absent: ['@mui/material', 'react', 'react-dom', 'react-hook-form'],
    dependencies: { zod: '4.4.3' },
    expectedExports: [
      'createPhoneExtensionSchema',
      'createPhoneFormSchema',
      'createPhoneNumberTypeSchema',
      'createPhonePossibleSchema',
      'createPhoneSyntaxSchema',
      'createPhoneValidSchema',
    ],
    name: 'zod-only',
    specifier: '@wh1teee/mui-phone-input/zod',
  },
];

try {
  for (const profile of profiles) {
    const destination = join(temporaryRoot, profile.name);
    await mkdir(destination, { recursive: true });
    await writeFile(
      join(destination, 'package.json'),
      `${JSON.stringify(
        {
          dependencies: {
            '@wh1teee/mui-phone-input': `file:${tarball}`,
            ...profile.dependencies,
          },
          name: `@mui-phone-input/${profile.name}-verification`,
          private: true,
          type: 'module',
          version: '0.0.0',
        },
        null,
        2,
      )}\n`,
    );
    await writeFile(
      join(destination, 'pnpm-workspace.yaml'),
      [
        'packages:',
        '  - .',
        '',
        'autoInstallPeers: false',
        'minimumReleaseAge: 1440',
        'minimumReleaseAgeStrict: false',
        'strictPeerDependencies: false',
        '',
      ].join('\n'),
    );
    await writeFile(
      join(destination, 'probe.mjs'),
      `const loaded = await import(${JSON.stringify(profile.specifier)});\nconsole.log(JSON.stringify(Object.keys(loaded).sort()));\n`,
    );

    run('pnpm', ['--dir', destination, 'install', '--frozen-lockfile=false']);
    const result = JSON.parse(
      execFileSync(process.execPath, ['probe.mjs'], {
        cwd: destination,
        encoding: 'utf8',
      }),
    );
    assert.deepEqual(
      result,
      [...profile.expectedExports].sort(),
      `${profile.name} loaded an unexpected public runtime surface.`,
    );
    for (const dependency of profile.absent) {
      assert.equal(
        await pathExists(join(destination, 'node_modules', dependency)),
        false,
        `${profile.name} unexpectedly installed ${dependency}.`,
      );
    }
    assert.equal(
      await sha256File(tarball),
      authoritativeTarballDigest,
      `${profile.name} mutated the authoritative package artifact.`,
    );
    console.log(
      `${profile.name} exact-tarball install/import verified without forbidden optional peers.`,
    );
  }
} finally {
  await rm(temporaryRoot, { force: true, recursive: true });
  if (ownsArtifact) {
    await releasePackageArtifact(tarball);
  }
}
