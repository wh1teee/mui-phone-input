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
  const optionalPeer = contract.optionalPeers?.[subpath];
  if (optionalPeer) {
    let peerAvailable = true;
    try {
      await import(optionalPeer);
    } catch (error) {
      if (error?.code !== 'ERR_MODULE_NOT_FOUND') {
        throw error;
      }
      peerAvailable = false;
    }

    if (!peerAvailable) {
      let adapterError;
      try {
        await import(packageSpecifier(subpath));
      } catch (error) {
        adapterError = error;
      }
      assert.ok(
        adapterError,
        `${subpath} unexpectedly loaded without ${optionalPeer}.`,
      );
      assert.equal(
        adapterError.code,
        'ERR_MODULE_NOT_FOUND',
        `${subpath} must fail because its own optional peer is absent.`,
      );
      assert.match(
        adapterError.message,
        new RegExp(optionalPeer, 'u'),
        `${subpath} missing-peer error must name ${optionalPeer}.`,
      );
      continue;
    }
  }

  const loaded =
    subpath === './package.json'
      ? await import(packageSpecifier(subpath), { with: { type: 'json' } })
      : await import(packageSpecifier(subpath));
  assert.ok(
    Object.keys(loaded).length > 0,
    `${subpath} must expose a nonempty implemented contract.`,
  );
}

for (const subpath of contract.implementedAssets ?? []) {
  const resolved = import.meta.resolve(packageSpecifier(subpath));
  const contents = await readFile(new URL(resolved), 'utf8');
  assert.ok(contents.length > 0, `${subpath} must expose a nonempty asset.`);
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
  `Consumer export contract verified: ${contract.implemented.length} implemented modules, ${(contract.implementedAssets ?? []).length} implemented assets, ${Object.keys(contract.intentionallyAbsent).length} intentionally absent.`,
);
