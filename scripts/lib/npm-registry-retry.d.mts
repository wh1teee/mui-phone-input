export interface RegistryCommandResult {
  error?: Error | undefined;
  status: number | null;
  stderr?: string | null | undefined;
  stdout?: string | null | undefined;
}

export interface ReadRegistryJsonWithRetryOptions {
  attempts?: number;
  delayMs?: number;
  description: string;
  execute: () => RegistryCommandResult;
  sleep?: (milliseconds: number) => Promise<void>;
}

export interface RunRegistryCommandWithRetryOptions {
  attempts?: number;
  description: string;
  execute: () => RegistryCommandResult;
  initialDelayMs?: number;
  maxDelayMs?: number;
  sleep?: (milliseconds: number) => Promise<void>;
}

export function runRegistryCommandWithRetry(
  options: RunRegistryCommandWithRetryOptions,
): Promise<RegistryCommandResult>;

export function readRegistryJsonWithRetry<T = unknown>(
  options: ReadRegistryJsonWithRetryOptions,
): Promise<T>;
