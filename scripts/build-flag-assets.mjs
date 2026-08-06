import { createRequire } from 'node:module';
import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

const packageRoot = process.cwd();
const require = createRequire(join(packageRoot, 'package.json'));
const sourcePackage = dirname(require.resolve('country-flag-icons/package.json'));
const sourceFlags = join(sourcePackage, '3x2');
const outputRoot = resolve(packageRoot, 'dist');
const outputFlags = join(outputRoot, 'flags', '3x2');

const flagFiles = (await readdir(sourceFlags))
  .filter((filename) => filename.endsWith('.svg'))
  .sort();

await mkdir(outputFlags, { recursive: true });
for (const filename of flagFiles) {
  await cp(join(sourceFlags, filename), join(outputFlags, filename));
}

const css = [
  "[class*=' flag:'],[class^='flag:']{display:inline-block;background-position:center;background-repeat:no-repeat;background-size:cover;height:1em;width:1.5em;--CountryFlagIcon-height:1em;height:var(--CountryFlagIcon-height);width:calc(var(--CountryFlagIcon-height)*3/2)}",
  ...flagFiles.map((filename) => {
    const code = filename.slice(0, -'.svg'.length);
    return `.flag\\:${code}{background-image:url(\"./flags/3x2/${filename}\")}`;
  }),
  '',
].join('\n');

await writeFile(join(outputRoot, 'flags.css'), css, 'utf8');
console.log(`Generated ${flagFiles.length} local flag assets.`);
