import { describe, expect, it } from 'vitest';

import {
  commonAncestor,
  isPathWithin,
  resolveDocsExecutionTopology,
  sharedGlobalStoreRoot,
} from '../../scripts/lib/docs-gvs-topology.mjs';

const windows = process.platform === 'win32';
const root = windows ? 'C:\\' : '/';
const workspace = windows
  ? 'C:\\work\\mui-phone-input'
  : '/home/kostya/work/mui-phone-input';
const localNext = windows
  ? `${workspace}\\node_modules\\next\\package.json`
  : `${workspace}/node_modules/next/package.json`;
const storePath = windows
  ? 'D:\\pnpm\\store-views\\1000\\v11'
  : '/var/cache/ci/pnpm/store-views/1000/v11';
const globalNext = windows
  ? `${storePath}\\links\\next\\node_modules\\next\\package.json`
  : `${storePath}/links/next/node_modules/next/package.json`;

describe('docs Global Virtual Store topology', () => {
  it('recognizes bounded descendants and their common ancestor', () => {
    expect(isPathWithin(workspace, localNext)).toBe(true);
    expect(commonAncestor(workspace, localNext)).toBe(workspace);
    expect(isPathWithin(workspace, globalNext)).toBe(false);
  });

  it('runs directly when Next.js resolves inside the repository', () => {
    expect(
      resolveDocsExecutionTopology({
        globalVirtualStoreEnabled: false,
        nextPackageManifest: localNext,
        storePath,
        workspaceRoot: workspace,
      }),
    ).toEqual({ kind: 'direct', turbopackRoot: workspace });
  });

  it('stages split-root Global Virtual Store builds below the shared store root', () => {
    if (windows) {
      expect(
        resolveDocsExecutionTopology({
          globalVirtualStoreEnabled: true,
          nextPackageManifest: globalNext,
          storePath,
          workspaceRoot: workspace,
        }),
      ).toMatchObject({ kind: 'stage', sharedRoot: 'D:\\pnpm' });
      return;
    }

    expect(sharedGlobalStoreRoot(storePath)).toBe('/var/cache/ci/pnpm');
    expect(
      resolveDocsExecutionTopology({
        globalVirtualStoreEnabled: true,
        nextPackageManifest: globalNext,
        storePath,
        workspaceRoot: workspace,
      }),
    ).toEqual({
      kind: 'stage',
      sharedRoot: '/var/cache/ci/pnpm',
      stageParent: '/var/cache/ci/pnpm/workspaces',
    });
  });

  it('fails closed for split roots without the Global Virtual Store contract', () => {
    if (windows) return;
    expect(commonAncestor('/home/project', '/var/cache/dependency')).toBe(root);
    expect(() =>
      resolveDocsExecutionTopology({
        globalVirtualStoreEnabled: false,
        nextPackageManifest: globalNext,
        storePath,
        workspaceRoot: workspace,
      }),
    ).toThrow(/no bounded common parent/u);
  });

  it('rejects an unrecognized store layout instead of guessing a broad root', () => {
    expect(() => sharedGlobalStoreRoot(`${root}unrecognized/cache/v11`)).toThrow(
      /Cannot derive a bounded shared pnpm root/u,
    );
  });
});
