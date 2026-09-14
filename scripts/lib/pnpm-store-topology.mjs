import {
  basename,
  dirname,
  isAbsolute,
  parse,
  relative,
  resolve,
  sep,
} from 'node:path';

export function isPathWithin(parent, child) {
  const childFromParent = relative(parent, child);
  return (
    childFromParent === '' ||
    (!isAbsolute(childFromParent) &&
      childFromParent !== '..' &&
      !childFromParent.startsWith(`..${sep}`))
  );
}

export function commonAncestor(left, right) {
  let candidate = resolve(left);
  const filesystemRoot = parse(candidate).root;

  while (!isPathWithin(candidate, right)) {
    if (candidate === filesystemRoot) return filesystemRoot;
    candidate = dirname(candidate);
  }

  return candidate;
}

export function sharedGlobalStoreRoot(storePath) {
  let candidate = resolve(storePath);
  const filesystemRoot = parse(candidate).root;

  while (candidate !== filesystemRoot) {
    if (['store', 'store-views'].includes(basename(candidate))) {
      const sharedRoot = dirname(candidate);
      if (sharedRoot === parse(sharedRoot).root) {
        break;
      }
      return sharedRoot;
    }
    candidate = dirname(candidate);
  }

  throw new Error(
    `Cannot derive a bounded shared pnpm root from store path ${storePath}.`,
  );
}
