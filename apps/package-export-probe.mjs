import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const packageName = '@wh1teee/mui-phone-input';
const contract = JSON.parse(
  await readFile(new URL('./package-export-contract.json', import.meta.url), 'utf8'),
);

function packageSpecifier(subpath) {
  return subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`;
}

for (const subpath of contract.implemented) {
  const loaded =
    subpath === './package.json'
      ? await import(packageSpecifier(subpath), { with: { type: 'json' } })
      : await import(packageSpecifier(subpath));
  assert.ok(
    Object.keys(loaded).length > 0,
    `${subpath} must expose a nonempty implemented contract.`,
  );
}

for (const [subpath, owner] of Object.entries(contract.intentionallyAbsent)) {
  try {
    await import(packageSpecifier(subpath));
    assert.fail(`${subpath} unexpectedly resolved before ${owner}.`);
  } catch (error) {
    assert.equal(
      error?.code,
      'ERR_PACKAGE_PATH_NOT_EXPORTED',
      `${subpath} must remain unexported until ${owner}.`,
    );
  }
}

console.log(
  `Consumer export contract verified: ${contract.implemented.length} implemented, ${Object.keys(contract.intentionallyAbsent).length} intentionally absent.`,
);
