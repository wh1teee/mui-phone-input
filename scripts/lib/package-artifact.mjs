import { spawnSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
export const repositoryRoot = resolve(scriptsDirectory, '../..');
export const artifactsDirectory = join(repositoryRoot, '.artifacts');
const ownedArtifactDirectories = new Set();

process.once('exit', () => {
  for (const artifactDirectory of ownedArtifactDirectories) {
    rmSync(artifactDirectory, { force: true, recursive: true });
  }
});

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

export async function releasePackageArtifact(tarball) {
  const artifactDirectory = dirname(tarball);
  if (!ownedArtifactDirectories.delete(artifactDirectory)) {
    return;
  }
  await rm(artifactDirectory, { force: true, recursive: true });
}

export async function createPackageArtifact() {
  await mkdir(artifactsDirectory, { recursive: true });
  const artifactDirectory = await mkdtemp(join(artifactsDirectory, 'run-'));
  ownedArtifactDirectories.add(artifactDirectory);

  try {
    run('pnpm', ['build']);
    run('pnpm', [
      '--dir',
      'packages/mui-phone-input',
      'pack',
      '--pack-destination',
      artifactDirectory,
    ]);

    const tarballs = (await readdir(artifactDirectory)).filter((file) =>
      file.endsWith('.tgz'),
    );
    if (tarballs.length !== 1) {
      throw new Error(`Expected one package tarball, found ${tarballs.length}.`);
    }

    const tarball = join(artifactDirectory, tarballs[0]);
    await writeFile(
      join(artifactDirectory, 'package-artifact.json'),
      `${JSON.stringify({ tarball }, null, 2)}\n`,
    );
    return tarball;
  } catch (error) {
    await releasePackageArtifact(join(artifactDirectory, 'failed.tgz'));
    throw error;
  }
}
