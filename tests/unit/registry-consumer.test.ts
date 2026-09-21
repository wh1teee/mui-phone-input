import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { createRegistryConsumerDependencies } from '../../scripts/lib/registry-consumer.mjs';

const manifest = JSON.parse(
  readFileSync('packages/mui-phone-input/package.json', 'utf8'),
);

describe('registry verification consumer', () => {
  it('declares all exercised renderer peers even when npm will not auto-install them', () => {
    const dependencies = createRegistryConsumerDependencies(manifest);
    for (const peer of [
      'react',
      'react-dom',
      '@mui/material',
      '@emotion/react',
      '@emotion/styled',
      '@base-ui/react',
    ]) {
      expect(dependencies[peer]).toBe(manifest.devDependencies[peer]);
    }
    expect(dependencies[manifest.name]).toBe(manifest.version);
    expect(dependencies['react-hook-form']).toBeUndefined();
    expect(dependencies.zod).toBeUndefined();
  });

  it('supports the existing MUI-only canaries without adding a nonexistent Base UI peer', () => {
    const legacy = structuredClone(manifest);
    delete legacy.exports['./base-ui'];
    delete legacy.peerDependencies['@base-ui/react'];
    delete legacy.devDependencies['@base-ui/react'];
    expect(
      createRegistryConsumerDependencies(legacy)['@base-ui/react'],
    ).toBeUndefined();
  });

  it('fails closed rather than resolving a missing or mutable dependency pin', () => {
    for (const version of [
      undefined,
      'latest',
      '^1.8.0',
      'file:/tmp/base-ui',
      'https://example.test/pkg.tgz',
    ]) {
      const invalid = structuredClone(manifest);
      invalid.devDependencies['@base-ui/react'] = version;
      expect(() => createRegistryConsumerDependencies(invalid)).toThrow();
    }
  });
});
