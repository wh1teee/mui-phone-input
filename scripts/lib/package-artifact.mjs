import { spawnSync } from 'node:child_process';
import { mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptsDirectory, '../..');
export const artifactsDirectory = join(repositoryRoot, '.artifacts');

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    env: process.env,
    shell: false,
    ...options,
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(' ')} exited with status ${result.status ?? 'unknown'}.`,
    );
  }
}

export async function createPackageArtifact() {
  await rm(artifactsDirectory, { force: true, recursive: true });
  await mkdir(artifactsDirectory, { recursive: true });

  run('pnpm', ['build']);
  run('pnpm', [
    '--dir',
    'packages/mui-phone-input',
    'pack',
    '--pack-destination',
    artifactsDirectory,
  ]);

  const tarballs = (await readdir(artifactsDirectory)).filter((file) =>
    file.endsWith('.tgz'),
  );
  if (tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}.`);
  }

  const tarball = join(artifactsDirectory, tarballs[0]);
  await writeFile(
    join(artifactsDirectory, 'package-artifact.json'),
    `${JSON.stringify({ tarball }, null, 2)}\n`,
  );
  return tarball;
}
