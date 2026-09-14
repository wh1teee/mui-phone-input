import { join, parse } from 'node:path';

import {
  commonAncestor,
  isPathWithin,
  sharedGlobalStoreRoot,
} from './pnpm-store-topology.mjs';

export { commonAncestor, isPathWithin, sharedGlobalStoreRoot };

export function resolveDocsExecutionTopology({
  globalVirtualStoreEnabled,
  nextPackageManifest,
  storePath,
  workspaceRoot,
}) {
  const turbopackRoot = commonAncestor(workspaceRoot, nextPackageManifest);
  if (turbopackRoot !== parse(turbopackRoot).root) {
    return { kind: 'direct', turbopackRoot };
  }

  if (!globalVirtualStoreEnabled) {
    throw new Error(
      [
        'The docs workspace and Next.js package have no bounded common parent.',
        `Workspace: ${workspaceRoot}`,
        `Next.js package: ${nextPackageManifest}`,
        'The pnpm Global Virtual Store is not enabled, so automatic shared-store staging is not applicable.',
      ].join('\n'),
    );
  }

  const sharedRoot = sharedGlobalStoreRoot(storePath);
  if (!isPathWithin(sharedRoot, nextPackageManifest)) {
    throw new Error(
      [
        'The resolved Next.js package is outside the configured shared pnpm root.',
        `Shared root: ${sharedRoot}`,
        `Next.js package: ${nextPackageManifest}`,
      ].join('\n'),
    );
  }

  return {
    kind: 'stage',
    sharedRoot,
    stageParent: join(sharedRoot, 'workspaces'),
  };
}
