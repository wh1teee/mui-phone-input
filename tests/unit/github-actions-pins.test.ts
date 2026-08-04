import { execFile } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const verifierPath = resolve('scripts/verify-github-actions-pins.mjs');
const fullSha = '0123456789abcdef0123456789abcdef01234567';

const runVerifier = async (workflowSource: string, nested = false) => {
  const workflowsDirectory = await mkdtemp(
    join(tmpdir(), 'mui-phone-input-actions-pins-'),
  );
  const targetDirectory = nested
    ? join(workflowsDirectory, 'release')
    : workflowsDirectory;
  await mkdir(targetDirectory, { recursive: true });
  await writeFile(
    join(targetDirectory, nested ? 'publish.yaml' : 'ci.yml'),
    workflowSource,
  );

  try {
    const result = await execFileAsync(process.execPath, [
      verifierPath,
      workflowsDirectory,
    ]);
    return { exitCode: 0, stderr: result.stderr, stdout: result.stdout };
  } catch (error) {
    const failure = error as {
      code?: number;
      stderr?: string;
      stdout?: string;
    };
    return {
      exitCode: failure.code ?? 1,
      stderr: failure.stderr ?? '',
      stdout: failure.stdout ?? '',
    };
  } finally {
    await rm(workflowsDirectory, { force: true, recursive: true });
  }
};

describe('GitHub Actions immutable pin verifier', () => {
  it.each([
    ['mutable major tag', 'actions/checkout@v4'],
    ['main branch', 'actions/checkout@main'],
    ['master branch', 'actions/checkout@master'],
    ['release branch', 'actions/checkout@release'],
    ['feature branch', 'actions/checkout@feature-branch'],
    ['short SHA', 'actions/checkout@abcdef1'],
    ['39-character SHA', `actions/checkout@${fullSha.slice(0, -1)}`],
  ])('rejects a %s', async (_description, reference) => {
    const result = await runVerifier(`steps:\n  - uses: ${reference}\n`);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain(reference);
    expect(result.stderr).toContain('Required format:');
  });

  it('accepts a full lowercase 40-character SHA', async () => {
    const result = await runVerifier(
      `steps:\n  - uses: "actions/checkout@${fullSha}" # v4.4.0\n`,
    );

    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
  });

  it('accepts local actions and reusable workflows', async () => {
    const result = await runVerifier(
      "jobs:\n  local-action:\n    steps:\n      - uses: './.github/actions/test'\n  local-workflow:\n    uses: ./.github/workflows/reuse.yml\n",
    );

    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
    expect(result.stdout).toContain('0 external and 2 local');
  });

  it('rejects a mutable job-level reusable workflow recursively', async () => {
    const result = await runVerifier(
      'jobs:\n  publish:\n    uses: owner/repository/.github/workflows/publish.yml@main\n',
      true,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('publish.yaml:3:');
    expect(result.stderr).toContain(
      'owner/repository/.github/workflows/publish.yml@main',
    );
  });

  it('does not let a comment mask a mutable reference', async () => {
    const result = await runVerifier(
      `steps:\n  - uses: actions/checkout@v4 # actions/checkout@${fullSha}\n`,
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('actions/checkout@v4');
  });

  it('rejects a mutable reference in a flow-style mapping', async () => {
    const result = await runVerifier(
      'steps:\n  - { name: Checkout, uses: actions/checkout@v4 }\n',
    );

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('actions/checkout@v4');
  });

  it('accepts a pinned reference in a flow-style mapping', async () => {
    const result = await runVerifier(
      `steps:\n  - { uses: 'actions/checkout@${fullSha}', name: Checkout }\n`,
    );

    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
  });

  it('ignores uses-like text inside comments and block scalars', async () => {
    const result = await runVerifier(
      `# uses: actions/checkout@v4\nsteps:\n  - run: |\n      echo 'uses: actions/checkout@main'\n  - uses: actions/checkout@${fullSha}\n`,
    );

    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
  });

  it('ignores flow-mapping-like text in an unrelated scalar', async () => {
    const result = await runVerifier(
      `steps:\n  - run: "echo { uses: actions/checkout@main }"\n  - uses: actions/checkout@${fullSha}\n`,
    );

    expect(result).toMatchObject({ exitCode: 0, stderr: '' });
  });

  it.each([
    ['uppercase SHA', `actions/checkout@${fullSha.toUpperCase()}`],
    ['Docker action', 'docker://alpine:3.22'],
    ['malformed value', ''],
  ])('rejects an unsupported %s', async (_description, reference) => {
    const result = await runVerifier(`steps:\n  - uses: ${reference}\n`);

    expect(result.exitCode).toBe(1);
    expect(result.stderr).toContain('Required format:');
  });
});
