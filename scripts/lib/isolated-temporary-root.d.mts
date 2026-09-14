export interface IsolatedTemporaryRootOptions {
  candidateParents?: string[];
  forbiddenPackages?: string[];
}

export function findAncestorPackage(
  startPath: string,
  packageName: string,
): Promise<string | undefined>;

export function createIsolatedTemporaryRoot(
  prefix: string,
  options?: IsolatedTemporaryRootOptions,
): Promise<string>;
