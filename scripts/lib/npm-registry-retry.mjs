const transientRegistryMissPattern =
  /(?:\bE404\b|\bETARGET\b|No match(?:ing)? found for version|No matching version found|Not Found - GET)/iu;

const defaultSleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function formatFailure(description, result) {
  const status = result.status ?? 'unknown';
  const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
  return `${description} failed with status ${status}${details ? `:\n${details}` : '.'}`;
}

function isTransientRegistryMiss(result) {
  const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
  return transientRegistryMissPattern.test(output);
}

export async function runRegistryCommandWithRetry({
  attempts = 6,
  description,
  execute,
  initialDelayMs = 1_000,
  maxDelayMs = 8_000,
  sleep = defaultSleep,
}) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new TypeError('attempts must be a positive integer.');
  }
  if (!Number.isFinite(initialDelayMs) || initialDelayMs < 0) {
    throw new TypeError('initialDelayMs must be a non-negative finite number.');
  }
  if (!Number.isFinite(maxDelayMs) || maxDelayMs < initialDelayMs) {
    throw new TypeError('maxDelayMs must be finite and at least initialDelayMs.');
  }

  let lastFailure;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = execute();
    if (result.error) {
      throw result.error;
    }
    if (result.status === 0) {
      return result;
    }

    lastFailure = result;
    if (!isTransientRegistryMiss(result)) {
      throw new Error(formatFailure(description, result));
    }
    if (attempt < attempts) {
      const delayMs = Math.min(initialDelayMs * 2 ** (attempt - 1), maxDelayMs);
      await sleep(delayMs);
    }
  }

  throw new Error(
    `${description} failed after ${attempts} attempts:\n${formatFailure(
      description,
      lastFailure,
    )}`,
  );
}

export async function readRegistryJsonWithRetry({
  attempts = 15,
  delayMs = 2_000,
  description,
  execute,
  sleep = defaultSleep,
}) {
  if (!Number.isInteger(attempts) || attempts < 1) {
    throw new TypeError('attempts must be a positive integer.');
  }

  let lastFailure;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = execute();
    if (result.error) {
      throw result.error;
    }
    if (result.status === 0) {
      try {
        return JSON.parse(result.stdout ?? '');
      } catch (error) {
        throw new Error(`${description} returned invalid JSON.`, { cause: error });
      }
    }

    lastFailure = result;
    if (!isTransientRegistryMiss(result)) {
      throw new Error(formatFailure(description, result));
    }
    if (attempt < attempts) {
      await sleep(delayMs);
    }
  }

  throw new Error(
    `${description} failed after ${attempts} attempts:\n${formatFailure(
      description,
      lastFailure,
    )}`,
  );
}
