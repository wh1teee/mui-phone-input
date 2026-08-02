import { describe, expect, it } from 'vitest';

describe('foundation test seam', () => {
  it('exposes the tracer only from the client entrypoint', async () => {
    const clientEntry = await import('../../packages/mui-phone-input/src/index');
    const serverEntry = await import('../../packages/mui-phone-input/src/server');

    expect(Object.keys(clientEntry)).toEqual(
      expect.arrayContaining([
        'MuiPhoneInput',
        'assertPhoneValue',
        'isPhoneValue',
        'parsePhoneValue',
      ]),
    );
    expect(Object.keys(serverEntry).sort()).toEqual([
      'assertPhoneValue',
      'isPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
    ]);
    expect(serverEntry).not.toHaveProperty('MuiPhoneInput');
  });
});
