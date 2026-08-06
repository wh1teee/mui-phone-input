import { describe, expect, it } from 'vitest';

import customMetadata, {
  validatePhoneMetadata,
} from '../../packages/mui-phone-input/src/metadata/custom';
import maxMetadata from '../../packages/mui-phone-input/src/metadata/max';
import minMetadata from '../../packages/mui-phone-input/src/metadata/min';
import mobileMetadata from '../../packages/mui-phone-input/src/metadata/mobile';
import {
  resolveNumberingPlan,
  validatePhoneValue,
} from '../../packages/mui-phone-input/src/server';

const PRESETS = [
  ['max', maxMetadata],
  ['min', minMetadata],
  ['mobile', mobileMetadata],
] as const;

describe('metadata presets', () => {
  it.each(PRESETS)(
    '%s preserves possible-by-default server semantics',
    (_name, metadata) => {
      expect(validatePhoneValue('+375291234567', { metadata })).toMatchObject({
        accepted: true,
        isPossible: true,
        mode: 'possible',
      });
      expect(resolveNumberingPlan('+375291234567', { metadata })).toMatchObject({
        countryCallingCode: '375',
        resolvedCountry: 'BY',
      });
    },
  );

  it('keeps strict validity and number type metadata-dependent', () => {
    expect(
      validatePhoneValue('+375291234567', { metadata: maxMetadata }),
    ).toMatchObject({
      isValid: true,
      numberType: 'MOBILE',
    });
    expect(
      validatePhoneValue('+375291234567', { metadata: minMetadata }),
    ).toMatchObject({
      isPossible: true,
      numberType: null,
    });
  });

  it('rejects malformed custom metadata before it reaches phone-number APIs', () => {
    expect(() => validatePhoneMetadata(null)).toThrow(TypeError);
    expect(() => validatePhoneMetadata({ countries: {} })).toThrow(TypeError);
    expect(() =>
      validatePhoneMetadata({
        version: 4,
        country_calling_codes: { 375: ['BY'] },
        countries: {},
        nonGeographic: {},
      }),
    ).toThrow(TypeError);
  });

  it('accepts generated libphonenumber metadata without creating new numbering rules', () => {
    expect(validatePhoneMetadata(maxMetadata)).toBe(maxMetadata);
    expect(customMetadata).toBe(validatePhoneMetadata);
  });
});
