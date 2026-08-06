import { describe, expect, it } from 'vitest';
import * as clientEntry from '../../packages/mui-phone-input/src/index';
import * as serverEntry from '../../packages/mui-phone-input/src/server';
import browserConfig from '../../vitest.browser.config';

describe('foundation test seam', () => {
  it('exposes the tracer only from the client entrypoint', () => {
    expect(Object.keys(clientEntry)).toEqual(
      expect.arrayContaining([
        'MuiPhoneInput',
        'assertPhoneExtension',
        'assertPhoneValue',
        'isPhoneValue',
        'parsePhoneExtension',
        'parseNationalPhoneValue',
        'parseRfc3966',
        'parsePhoneValue',
        'serializeRfc3966',
        'validatePhoneMetadata',
      ]),
    );
    expect(Object.keys(serverEntry).sort()).toEqual([
      'assertPhoneExtension',
      'assertPhoneValue',
      'formatPhoneValueForDisplay',
      'isPhoneExtension',
      'isPhoneValue',
      'parseNationalPhoneValue',
      'parsePhoneExtension',
      'parsePhoneValue',
      'parseRfc3966',
      'resolveNumberingPlan',
      'serializeRfc3966',
      'validatePhoneMetadata',
      'validatePhoneValue',
    ]);
    expect(serverEntry).not.toHaveProperty('MuiPhoneInput');
  });

  it('serializes browser files that share document focus', () => {
    expect(browserConfig).toMatchObject({
      test: {
        browser: {
          fileParallelism: false,
        },
      },
    });
  });
});
