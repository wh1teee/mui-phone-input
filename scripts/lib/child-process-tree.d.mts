import type { ChildProcess, SpawnOptions } from 'node:child_process';

export interface ChildProcessTerminationOptions {
  forceTimeoutMs?: number;
  gracefulTimeoutMs?: number;
}

export function detachedChildProcessOptions<T extends SpawnOptions>(
  options?: T,
): T & { detached: boolean };

export function terminateChildProcessTree(
  childProcess: ChildProcess,
  options?: ChildProcessTerminationOptions,
): Promise<void>;
