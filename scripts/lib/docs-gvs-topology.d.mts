export interface DocsExecutionTopologyOptions {
  globalVirtualStoreEnabled: boolean;
  nextPackageManifest: string;
  storePath: string;
  workspaceRoot: string;
}

export type DocsExecutionTopology =
  | { kind: 'direct'; turbopackRoot: string }
  | {
      kind: 'stage';
      sharedRoot: string;
      stageParent: string;
    };

export function isPathWithin(parent: string, child: string): boolean;
export function commonAncestor(left: string, right: string): string;
export function sharedGlobalStoreRoot(storePath: string): string;
export function resolveDocsExecutionTopology(
  options: DocsExecutionTopologyOptions,
): DocsExecutionTopology;
