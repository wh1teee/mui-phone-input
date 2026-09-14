import { mkdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  resolveBoundedTurbopackRoot,
  resolveBoundedTurbopackRootFromRealPaths,
} from '../../apps/docs/turbopack-root';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { force: true, recursive: true })),
  );
});

async function temporaryRoot(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'mui-phone-input-turbopack-'));
  temporaryDirectories.push(directory);
  return realpathSync(directory);
}

describe('resolveBoundedTurbopackRoot', () => {
  it('keeps the repository root when Next.js is installed inside it', async () => {
    const root = await temporaryRoot();
    const workspace = join(root, 'workspace');
    const nextManifest = join(workspace, 'node_modules/next/package.json');
    mkdirSync(join(workspace, 'node_modules/next'), { recursive: true });
    writeFileSync(nextManifest, '{}\n');

    expect(
      resolveBoundedTurbopackRoot({
        nextPackageManifest: nextManifest,
        workspaceRoot: workspace,
      }),
    ).toBe(workspace);
  });

  it('uses the bounded shared parent for a Global Virtual Store target', async () => {
    const root = await temporaryRoot();
    const workspace = join(root, 'work/mui-phone-input');
    const realNextManifest = join(root, 'pnpm/store/links/next/package.json');
    const linkedNext = join(workspace, 'node_modules/next');
    mkdirSync(join(realNextManifest, '..'), { recursive: true });
    mkdirSync(join(linkedNext, '..'), { recursive: true });
    writeFileSync(realNextManifest, '{}\n');
    symlinkSync(join(realNextManifest, '..'), linkedNext, 'dir');

    expect(
      resolveBoundedTurbopackRoot({
        nextPackageManifest: join(linkedNext, 'package.json'),
        workspaceRoot: workspace,
      }),
    ).toBe(root);
  });

  it('fails closed instead of broadening Turbopack to the filesystem root', () => {
    expect(() =>
      resolveBoundedTurbopackRootFromRealPaths({
        nextPackageManifest: '/var/cache/ci/pnpm/store/links/next/package.json',
        workspaceRoot: '/home/kostya/work/mui-phone-input',
      }),
    ).toThrow(/Refusing to use the filesystem root/u);
  });
});
