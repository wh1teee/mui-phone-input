import { mkdir, mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createIsolatedTemporaryRoot,
  findAncestorPackage,
} from '../../scripts/lib/isolated-temporary-root.mjs';

const fixtureRoots: string[] = [];

async function createFixtureRoot(): Promise<string> {
  const parent = process.platform === 'win32' ? tmpdir() : '/tmp';
  const fixtureRoot = await mkdtemp(join(parent, 'mui-phone-input-isolation-'));
  fixtureRoots.push(fixtureRoot);
  return realpath(fixtureRoot);
}

async function createAncestorPackage(
  ancestor: string,
  packageName: string,
): Promise<string> {
  const packageRoot = join(ancestor, 'node_modules', ...packageName.split('/'));
  await mkdir(packageRoot, { recursive: true });
  await writeFile(join(packageRoot, 'package.json'), '{}\n');
  return packageRoot;
}

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((fixtureRoot) => rm(fixtureRoot, { force: true, recursive: true })),
  );
});

describe('isolated temporary roots', () => {
  it('skips a contaminated parent and returns a clean fallback', async () => {
    const fixtureRoot = await createFixtureRoot();
    const contaminatedParent = join(fixtureRoot, 'contaminated', 'nested');
    const cleanParent = join(fixtureRoot, 'clean', 'nested');
    const inheritedPackage = await createAncestorPackage(
      join(fixtureRoot, 'contaminated'),
      'react-hook-form',
    );

    expect(await findAncestorPackage(contaminatedParent, 'react-hook-form')).toBe(
      inheritedPackage,
    );

    const temporaryRoot = await createIsolatedTemporaryRoot('consumer-', {
      candidateParents: [contaminatedParent, cleanParent],
      forbiddenPackages: ['react-hook-form'],
    });

    expect(temporaryRoot.startsWith(await realpath(cleanParent))).toBe(true);
    expect(await findAncestorPackage(temporaryRoot, 'react-hook-form')).toBeUndefined();
  });

  it('handles scoped forbidden package names', async () => {
    const fixtureRoot = await createFixtureRoot();
    const contaminatedParent = join(fixtureRoot, 'contaminated');
    await createAncestorPackage(contaminatedParent, '@wh1teee/mui-phone-input');

    expect(
      await findAncestorPackage(
        join(contaminatedParent, 'consumer'),
        '@wh1teee/mui-phone-input',
      ),
    ).toBe(join(contaminatedParent, 'node_modules', '@wh1teee', 'mui-phone-input'));
  });

  it('fails closed when every candidate inherits a forbidden package', async () => {
    const fixtureRoot = await createFixtureRoot();
    const first = join(fixtureRoot, 'first');
    const second = join(fixtureRoot, 'second');
    await createAncestorPackage(first, 'zod');
    await createAncestorPackage(second, 'zod');

    await expect(
      createIsolatedTemporaryRoot('consumer-', {
        candidateParents: [first, second],
        forbiddenPackages: ['zod'],
      }),
    ).rejects.toThrow(/No isolated temporary root[\s\S]*inherits zod/u);
  });

  it('rejects path-like prefixes and package traversal', async () => {
    const fixtureRoot = await createFixtureRoot();
    await expect(
      createIsolatedTemporaryRoot('../consumer-', {
        candidateParents: [fixtureRoot],
      }),
    ).rejects.toThrow(/one path segment/u);
    await expect(findAncestorPackage(fixtureRoot, '../zod')).rejects.toThrow(
      /Invalid forbidden package name/u,
    );
  });
});
