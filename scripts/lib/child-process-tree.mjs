import { spawnSync } from 'node:child_process';

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isMissingProcessError(error) {
  return error instanceof Error && 'code' in error && error.code === 'ESRCH';
}

function unixProcessGroupAlive(pid) {
  try {
    process.kill(-pid, 0);
    return true;
  } catch (error) {
    if (isMissingProcessError(error)) return false;
    throw error;
  }
}

function childTreeAlive(childProcess) {
  const { pid } = childProcess;
  if (!pid) return false;
  if (process.platform !== 'win32') {
    return unixProcessGroupAlive(pid);
  }
  return childProcess.exitCode === null && childProcess.signalCode === null;
}

async function waitForTreeExit(childProcess, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!childTreeAlive(childProcess)) return true;
    await sleep(50);
  }
  return !childTreeAlive(childProcess);
}

function signalUnixProcessGroup(pid, signal) {
  try {
    process.kill(-pid, signal);
  } catch (error) {
    if (!isMissingProcessError(error)) throw error;
  }
}

export function detachedChildProcessOptions(options = {}) {
  return {
    ...options,
    detached: process.platform !== 'win32',
  };
}

export async function terminateChildProcessTree(
  childProcess,
  { forceTimeoutMs = 3_000, gracefulTimeoutMs = 3_000 } = {},
) {
  const { pid } = childProcess;
  if (!pid || !childTreeAlive(childProcess)) return;

  if (process.platform === 'win32') {
    childProcess.kill('SIGTERM');
  } else {
    signalUnixProcessGroup(pid, 'SIGTERM');
  }

  if (await waitForTreeExit(childProcess, gracefulTimeoutMs)) return;

  if (process.platform === 'win32') {
    const result = spawnSync('taskkill.exe', ['/pid', String(pid), '/t', '/f'], {
      encoding: 'utf8',
      shell: false,
    });
    if (![0, 128].includes(result.status ?? -1)) {
      throw new Error(
        `taskkill failed for process tree ${pid} with status ${result.status}.\n${result.stdout ?? ''}\n${result.stderr ?? ''}`,
      );
    }
  } else {
    signalUnixProcessGroup(pid, 'SIGKILL');
  }

  if (!(await waitForTreeExit(childProcess, forceTimeoutMs))) {
    throw new Error(`Consumer server process tree ${pid} survived forced shutdown.`);
  }
}
