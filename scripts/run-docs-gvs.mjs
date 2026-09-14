import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, realpath, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveDocsExecutionTopology } from './lib/docs-gvs-topology.mjs';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const generatedPathSegments = new Set([
  '.artifacts',
  '.beads',
  '.codegraph',
  '.dolt',
  '.git',
  '.next',
  '.vitest-attachments',
  'coverage',
  'dist',
  'node_modules',
  'playwright-report',
  'test-results',
]);

const modeCommands = Object.freeze({
  build: [['build'], ['--filter', '@mui-phone-input/docs', 'build']],
  ci: [
    ['build'],
    ['docs:lint'],
    ['--filter', '@mui-phone-input/docs', 'typecheck'],
    ['--filter', '@mui-phone-input/docs', 'build'],
    ['--filter', '@mui-phone-input/docs', 'test'],
    ['verify:docs'],
  ],
  test: [
    ['build'],
    ['--filter', '@mui-phone-input/docs', 'build'],
    ['--filter', '@mui-phone-input/docs', 'test'],
  ],
  typecheck: [['build'], ['--filter', '@mui-phone-input/docs', 'typecheck']],
});

function runPnpm(args, cwd, { capture = false } = {}) {
  const result = spawnSync(pnpmExecutable, args, {
    cwd,
    encoding: capture ? 'utf8' : undefined,
    env: process.env,
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const diagnostics = capture
      ? `\n${result.stdout ?? ''}\n${result.stderr ?? ''}`
      : '';
    throw new Error(
      `pnpm ${args.join(' ')} failed with status ${result.status ?? 'unknown'}.${diagnostics}`,
    );
  }

  return capture ? result.stdout.trim() : '';
}

function commandOutput(args, cwd) {
  const output = runPnpm(args, cwd, { capture: true });
  return output.split(/\r?\n/u).filter(Boolean).at(-1) ?? '';
}

async function installedNextManifest(root) {
  const require = createRequire(pathToFileURL(join(root, 'apps/docs/package.json')));
  return realpath(require.resolve('next/package.json'));
}

async function executionTopology(root) {
  const workspaceRoot = await realpath(root);
  const nextPackageManifest = await installedNextManifest(root);
  const globalVirtualStoreEnabled =
    commandOutput(['config', 'get', 'enableGlobalVirtualStore'], root) === 'true';
  const storePath = commandOutput(['store', 'path'], root);

  return resolveDocsExecutionTopology({
    globalVirtualStoreEnabled,
    nextPackageManifest,
    storePath,
    workspaceRoot,
  });
}

function shouldCopy(source) {
  const sourceFromRoot = relative(repositoryRoot, source);
  if (sourceFromRoot === '') return true;
  return !sourceFromRoot
    .split(sep)
    .some((segment) => generatedPathSegments.has(segment));
}

function runMode(mode, root) {
  const commands = modeCommands[mode];
  if (!commands) {
    throw new Error(
      `Unknown docs verification mode ${mode}. Expected one of ${Object.keys(modeCommands).join(', ')}.`,
    );
  }

  for (const args of commands) {
    runPnpm(args, root);
  }
}

async function runFromBoundedStage(mode, topology) {
  await mkdir(topology.stageParent, { recursive: true });
  const stageContainer = await mkdtemp(
    join(topology.stageParent, 'mui-phone-input-docs-'),
  );
  const stageRoot = join(stageContainer, 'workspace');
  const keepStage = process.env.MUI_PHONE_INPUT_KEEP_GVS_STAGE === '1';

  try {
    console.log(`Running ${mode} from bounded shared-GVS workspace ${stageRoot}.`);
    await cp(repositoryRoot, stageRoot, {
      filter: shouldCopy,
      recursive: true,
    });
    runPnpm(['install', '--frozen-lockfile'], stageRoot);

    const stagedTopology = await executionTopology(stageRoot);
    if (stagedTopology.kind !== 'direct') {
      throw new Error(
        `Shared-GVS staging did not produce a bounded direct topology: ${JSON.stringify(stagedTopology)}.`,
      );
    }

    runMode(mode, stageRoot);
  } finally {
    if (keepStage) {
      console.log(`Preserved shared-GVS workspace at ${stageContainer}.`);
    } else {
      await rm(stageContainer, { force: true, recursive: true });
    }
  }
}

const mode = process.argv[2];
if (!modeCommands[mode]) {
  throw new Error(
    `Usage: node scripts/run-docs-gvs.mjs <${Object.keys(modeCommands).join('|')}>`,
  );
}

const topology = await executionTopology(repositoryRoot);
if (topology.kind === 'direct') {
  runMode(mode, repositoryRoot);
} else {
  await runFromBoundedStage(mode, topology);
}
