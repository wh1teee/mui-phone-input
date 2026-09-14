import { mkdir, mkdtemp, realpath, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, parse, resolve, sep } from 'node:path';

function unique(values) {
  return [...new Set(values.filter(Boolean).map((value) => resolve(value)))];
}

function packageSegments(packageName) {
  if (
    typeof packageName !== 'string' ||
    packageName.length === 0 ||
    packageName.includes('\\') ||
    packageName.startsWith('/') ||
    packageName.split('/').some((segment) => segment.length === 0 || segment === '..')
  ) {
    throw new TypeError(`Invalid forbidden package name: ${String(packageName)}.`);
  }
  return packageName.split('/');
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

export async function findAncestorPackage(startPath, packageName) {
  const segments = packageSegments(packageName);
  let current = resolve(startPath);
  const filesystemRoot = parse(current).root;

  while (true) {
    const candidate = join(current, 'node_modules', ...segments);
    if (await pathExists(candidate)) {
      return candidate;
    }
    if (current === filesystemRoot) {
      return undefined;
    }
    current = dirname(current);
  }
}

function defaultCandidateParents() {
  const systemParents = process.platform === 'win32' ? [] : ['/tmp', '/var/tmp'];
  return unique([
    process.env.MUI_PHONE_INPUT_ISOLATED_TMP,
    process.env.RUNNER_TEMP,
    ...systemParents,
    tmpdir(),
  ]);
}

export async function createIsolatedTemporaryRoot(
  prefix,
  { candidateParents = defaultCandidateParents(), forbiddenPackages = [] } = {},
) {
  if (
    typeof prefix !== 'string' ||
    prefix.length === 0 ||
    prefix.includes('/') ||
    prefix.includes('\\') ||
    prefix.includes(sep)
  ) {
    throw new TypeError(`Temporary-root prefix must be one path segment: ${prefix}.`);
  }

  const packages = [...new Set(forbiddenPackages)];
  packages.forEach(packageSegments);
  const diagnostics = [];

  for (const candidateParent of unique(candidateParents)) {
    let temporaryRoot;
    try {
      await mkdir(candidateParent, { recursive: true });
      const parent = await realpath(candidateParent);
      const inheritedPackages = [];
      for (const packageName of packages) {
        const inheritedPath = await findAncestorPackage(parent, packageName);
        if (inheritedPath) {
          inheritedPackages.push(`${packageName} at ${inheritedPath}`);
        }
      }
      if (inheritedPackages.length > 0) {
        diagnostics.push(`${parent}: inherits ${inheritedPackages.join(', ')}`);
        continue;
      }

      temporaryRoot = await mkdtemp(join(parent, prefix));
      const realTemporaryRoot = await realpath(temporaryRoot);
      const leakedPackages = [];
      for (const packageName of packages) {
        const leakedPath = await findAncestorPackage(realTemporaryRoot, packageName);
        if (leakedPath) {
          leakedPackages.push(`${packageName} at ${leakedPath}`);
        }
      }
      if (leakedPackages.length > 0) {
        diagnostics.push(`${realTemporaryRoot}: resolves ${leakedPackages.join(', ')}`);
        await rm(realTemporaryRoot, { force: true, recursive: true });
        continue;
      }

      return realTemporaryRoot;
    } catch (error) {
      if (temporaryRoot) {
        await rm(temporaryRoot, { force: true, recursive: true }).catch(() => {});
      }
      diagnostics.push(
        `${candidateParent}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    [
      `No isolated temporary root is available for ${prefix}.`,
      `Forbidden ancestor packages: ${packages.join(', ') || '(none)'}.`,
      ...diagnostics.map((diagnostic) => `- ${diagnostic}`),
    ].join('\n'),
  );
}
