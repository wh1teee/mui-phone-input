import assert from 'node:assert/strict';

const REGION_START = '//#region ';
const REGION_END = '//#endregion';

export function normalizeTracerClosure(code) {
  const normalizedLines = [];
  let regionStarts = 0;
  let regionEnds = 0;

  for (const line of code.split('\n')) {
    if (line.startsWith(REGION_START)) {
      regionStarts += 1;
      continue;
    }
    if (line === REGION_END) {
      regionEnds += 1;
      continue;
    }
    normalizedLines.push(line);
  }

  assert.equal(
    regionStarts,
    regionEnds,
    `Rolldown emitted ${regionStarts} region starts but ${regionEnds} region ends.`,
  );

  return normalizedLines.join('\n');
}
