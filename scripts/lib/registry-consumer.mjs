import assert from 'node:assert/strict';

/** The registry smoke explicitly installs the renderer peers it exercises.
 * Read exact development pins from the published artifact, never mutable latest.
 */
export function createRegistryConsumerDependencies(manifest) {
  assert.equal(manifest.name, '@wh1teee/mui-phone-input');
  assert.match(manifest.version, /^(?:0\.1\.0-next\.\d+|[1-9]\d*\.\d+\.\d+)$/u);
  const peers = [
    'react',
    'react-dom',
    '@mui/material',
    '@emotion/react',
    '@emotion/styled',
    ...(manifest.exports?.['./base-ui'] ? ['@base-ui/react'] : []),
  ];
  const dependencies = { [manifest.name]: manifest.version };
  for (const peer of peers) {
    assert.ok(manifest.peerDependencies?.[peer], `Missing declared peer ${peer}.`);
    const version = manifest.devDependencies?.[peer];
    assert.equal(typeof version, 'string', `Missing reviewed version for ${peer}.`);
    assert.match(
      version,
      /^\d+\.\d+\.\d+$/u,
      `${peer} must have an exact reviewed pin.`,
    );
    dependencies[peer] = version;
  }
  return dependencies;
}
