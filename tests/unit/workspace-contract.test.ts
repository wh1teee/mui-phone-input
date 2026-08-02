import { describe, expect, it } from 'vitest';

import * as clientEntry from '../../packages/mui-phone-input/src/index';
import * as serverEntry from '../../packages/mui-phone-input/src/server';

describe('foundation test seam', () => {
  it('exposes the tracer only from the client entrypoint', () => {
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
      'formatPhoneValueForDisplay',
      'isPhoneValue',
      'parsePhoneValue',
      'resolveNumberingPlan',
      'validatePhoneValue',
    ]);
    expect(serverEntry).not.toHaveProperty('MuiPhoneInput');
  });
});
