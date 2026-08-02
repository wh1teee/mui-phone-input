import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { repositoryRoot } from './lib/package-artifact.mjs';
import { measureTracerPackage } from './lib/tracer-package-measurement.mjs';

const outputPath = resolve(
  repositoryRoot,
  'docs/research/2026-08-02-tracer-package-budget.json',
);
const measurement = await measureTracerPackage();

if (measurement.status !== 'pass') {
  throw new Error(`Tracer package exceeds its budget: ${JSON.stringify(measurement)}`);
}

await writeFile(outputPath, `${JSON.stringify(measurement, null, 2)}\n`);
const formatResult = spawnSync(
  'pnpm',
  ['exec', 'biome', 'format', '--write', outputPath],
  {
    cwd: repositoryRoot,
    encoding: 'utf8',
  },
);

if (formatResult.error) {
  throw formatResult.error;
}
if (formatResult.status !== 0) {
  throw new Error(
    `Biome failed to format tracer measurement: ${formatResult.stderr || formatResult.stdout}`,
  );
}

console.log(`Tracer package measurement written to ${outputPath}`);
