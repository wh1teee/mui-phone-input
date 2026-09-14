import { describe, expect, it } from 'vitest';

import {
  createIsolatedProcessEnvironment,
  sanitizeNodeOptions,
} from '../../scripts/lib/isolated-process-environment.mjs';

const pnpmHookSource = encodeURIComponent(`
  const { registerHooks } = await import('node:module');
  if (process.env.NODE_PATH) registerHooks({ resolve() {} });
`);
const pnpmHook = `--import=data:text/javascript,${pnpmHookSource}`;

describe('isolated process environment', () => {
  it('removes pnpm NODE_PATH resolution while preserving unrelated Node options', () => {
    const environment = createIsolatedProcessEnvironment({
      NODE_OPTIONS: `--max-old-space-size=32768 ${pnpmHook} --trace-warnings`,
      NODE_PATH: '/workspace/node_modules/.pnpm/node_modules:/workspace/node_modules',
      PATH: '/usr/bin',
    });

    expect(environment.NODE_PATH).toBeUndefined();
    expect(environment.NODE_OPTIONS).toBe(
      '--max-old-space-size=32768 --trace-warnings',
    );
    expect(environment.PATH).toBe('/usr/bin');
  });

  it('supports the two-token import form and removes an otherwise empty option', () => {
    expect(
      sanitizeNodeOptions(`--import data:text/javascript,${pnpmHookSource}`),
    ).toBeUndefined();
  });

  it('preserves unrelated data URL imports', () => {
    const legitimate = `--import=data:text/javascript,${encodeURIComponent('console.log("probe")')}`;
    expect(sanitizeNodeOptions(legitimate)).toBe(legitimate);
  });

  it('does not mutate the input environment', () => {
    const source = { NODE_OPTIONS: pnpmHook, NODE_PATH: '/workspace/node_modules' };
    createIsolatedProcessEnvironment(source);
    expect(source).toEqual({
      NODE_OPTIONS: pnpmHook,
      NODE_PATH: '/workspace/node_modules',
    });
  });
});
