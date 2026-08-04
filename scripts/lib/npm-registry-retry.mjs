const transientRegistryMissPattern =
  /(?:\bE404\b|No match found for version|Not Found - GET)/iu;

const defaultSleep = (milliseconds) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });

function formatFailure(description, result) {
  const status = result.status ?? 'unknown';
  const details = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
  return `${description} failed with status ${status}${details ? `:\n${details}` : '.'}`;
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
    const output = `${result.stderr ?? ''}\n${result.stdout ?? ''}`;
    if (!transientRegistryMissPattern.test(output)) {
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
