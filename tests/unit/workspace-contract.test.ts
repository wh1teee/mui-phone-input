import { describe, expect, it } from 'vitest';

describe('foundation test seam', () => {
  it('keeps runtime implementation behind the engine decision gate', async () => {
    const clientEntry = await import('../../packages/mui-phone-input/src/index');
    const serverEntry = await import('../../packages/mui-phone-input/src/server');

    expect(Object.keys(clientEntry)).toEqual([]);
    expect(Object.keys(serverEntry)).toEqual([]);
  });
});
