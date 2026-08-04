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

export function readRegistryJsonWithRetry<T = unknown>(
  options: ReadRegistryJsonWithRetryOptions,
): Promise<T>;
