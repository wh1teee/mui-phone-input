import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  diffMetadataSemanticSnapshots,
  renderMetadataSemanticDiff,
} from './lib/metadata-semantic-diff.mjs';

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
}

const beforePath = argument('before');
const afterPath = argument('after');
const outputPath = argument('output');

if (!beforePath || !afterPath || !outputPath) {
  throw new Error(
    'Usage: metadata-semantic-diff --before=<json> --after=<json> --output=<md>',
  );
}

const before = JSON.parse(await readFile(resolve(beforePath), 'utf8'));
const after = JSON.parse(await readFile(resolve(afterPath), 'utf8'));
const changes = diffMetadataSemanticSnapshots(before, after);
await writeFile(
  resolve(outputPath),
  renderMetadataSemanticDiff(before, after, changes),
);

console.log(`SEMANTIC_CHANGES=${changes.length > 0 ? 'true' : 'false'}`);
console.log(`SEMANTIC_CHANGE_COUNT=${changes.length}`);
