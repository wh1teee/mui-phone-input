import { realpathSync } from 'node:fs';
import { dirname, isAbsolute, parse, relative, resolve, sep } from 'node:path';

function isWithin(parent: string, child: string): boolean {
  const childFromParent = relative(parent, child);
  return (
    childFromParent === '' ||
    (!isAbsolute(childFromParent) &&
      !childFromParent.startsWith(`..${sep}`) &&
      childFromParent !== '..')
  );
}

function commonAncestor(left: string, right: string): string {
  let candidate = left;
  const filesystemRoot = parse(candidate).root;

  while (!isWithin(candidate, right)) {
    if (candidate === filesystemRoot) return filesystemRoot;
    candidate = dirname(candidate);
  }

  return candidate;
}

export interface TurbopackRootOptions {
  nextPackageManifest: string;
  workspaceRoot: string;
}

export function resolveBoundedTurbopackRootFromRealPaths({
  nextPackageManifest,
  workspaceRoot,
}: TurbopackRootOptions): string {
  if (isWithin(workspaceRoot, nextPackageManifest)) {
    return workspaceRoot;
  }

  const root = commonAncestor(workspaceRoot, nextPackageManifest);
  if (root === parse(root).root) {
    throw new Error(
      [
        'Refusing to use the filesystem root as turbopack.root.',
        `Workspace: ${workspaceRoot}`,
        `Next.js package: ${nextPackageManifest}`,
        'Place the checkout under a bounded common parent with the shared pnpm Global Virtual Store.',
      ].join('\n'),
    );
  }

  return root;
}

export function resolveBoundedTurbopackRoot({
  nextPackageManifest,
  workspaceRoot,
}: TurbopackRootOptions): string {
  return resolveBoundedTurbopackRootFromRealPaths({
    nextPackageManifest: realpathSync(resolve(nextPackageManifest)),
    workspaceRoot: realpathSync(resolve(workspaceRoot)),
  });
}
