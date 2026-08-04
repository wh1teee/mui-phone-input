import { spawnSync } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const browserTestsRoot = join(repositoryRoot, 'tests/browser');
const vitestEntry = join(repositoryRoot, 'node_modules/vitest/vitest.mjs');

async function collectBrowserTests(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectBrowserTests(path)));
    } else if (entry.isFile() && entry.name.endsWith('.browser.test.tsx')) {
      files.push(path);
    }
  }

  return files;
}

const requestedFiles = process.argv.slice(2);
const files = (
  requestedFiles.length > 0
    ? requestedFiles.map((file) => resolve(repositoryRoot, file))
    : await collectBrowserTests(browserTestsRoot)
).sort();

if (files.length === 0) {
  throw new Error('No Browser Mode test files were found.');
}

for (const [index, file] of files.entries()) {
  const displayPath = relative(repositoryRoot, file);
  if (!file.startsWith(`${browserTestsRoot}/`) || !file.endsWith('.browser.test.tsx')) {
    throw new Error(`Browser test is outside the supported suite: ${displayPath}`);
  }

  console.log(`[browser-file ${index + 1}/${files.length}] ${displayPath}`);
  const result = spawnSync(
    process.execPath,
    [
      vitestEntry,
      'run',
      '--config',
      'vitest.browser.config.ts',
      '--reporter=dot',
      displayPath,
    ],
    {
      cwd: repositoryRoot,
      env: process.env,
      stdio: 'inherit',
    },
  );

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log(`Browser Mode passed: ${files.length} serialized files.`);
