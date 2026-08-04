import { describe, expect, it, vi } from 'vitest';

import { readRegistryJsonWithRetry } from '../../scripts/lib/npm-registry-retry.mjs';

const success = (value: unknown) => ({
  error: undefined,
  status: 0,
  stderr: '',
  stdout: JSON.stringify(value),
});

const failure = (stderr: string) => ({
  error: undefined,
  status: 1,
  stderr,
  stdout: '',
});

describe('npm registry propagation retry', () => {
  it('retries a transient registry 404 and returns the propagated document', async () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(failure('npm error code E404\nNo match found for version'))
      .mockReturnValueOnce(success({ version: '0.1.0-next.1' }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      readRegistryJsonWithRetry({
        attempts: 3,
        description: 'npm view package',
        execute,
        sleep,
      }),
    ).resolves.toEqual({ version: '0.1.0-next.1' });
    expect(execute).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('fails after the bounded number of transient registry misses', async () => {
    const execute = vi.fn(() =>
      failure('npm error code E404\nNo match found for version'),
    );
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      readRegistryJsonWithRetry({
        attempts: 3,
        description: 'npm view package',
        execute,
        sleep,
      }),
    ).rejects.toThrow('npm view package failed after 3 attempts');
    expect(execute).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('does not retry non-propagation failures', async () => {
    const execute = vi.fn(() => failure('npm error code E401\nUnauthorized'));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(
      readRegistryJsonWithRetry({
        attempts: 3,
        description: 'npm view package',
        execute,
        sleep,
      }),
    ).rejects.toThrow('npm view package failed with status 1');
    expect(execute).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
