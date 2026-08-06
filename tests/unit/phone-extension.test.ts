import { describe, expect, it } from 'vitest';

import {
  assertPhoneExtension,
  parsePhoneExtensionBearingText,
  isPhoneExtension,
  parsePhoneExtension,
  parseRfc3966,
  serializeRfc3966,
} from '../../packages/mui-phone-input/src/phone-extension';

describe('Phone Extension', () => {
  it.each([undefined, '1', '00123', '12345678901234567890'])(
    'accepts canonical extension %s without imposing a universal length',
    (extension) => {
      expect(isPhoneExtension(extension)).toBe(true);
    },
  );

  it.each(['', '12 3', '+123', 'ext. 123', '１２３', null, 123])(
    'rejects non-canonical extension %s',
    (extension) => {
      expect(isPhoneExtension(extension)).toBe(false);
    },
  );

  it('normalizes supported Unicode digits and separators at the input boundary', () => {
    expect(parsePhoneExtension('１２ ٣-۴')).toBe('1234');
    expect(parsePhoneExtension('')).toBeUndefined();
  });

  it('applies an optional consumer max-length policy', () => {
    expect(parsePhoneExtension('123456')).toBe('123456');
    expect(parsePhoneExtension('123456', { maxLength: 4 })).toBe('1234');
  });

  it('rejects invalid extension policy configuration', () => {
    expect(() => parsePhoneExtension('123', { maxLength: 0 })).toThrow(TypeError);
    expect(() => parsePhoneExtension('123', { maxLength: 1.5 })).toThrow(TypeError);
  });

  it('asserts the digits-only canonical contract', () => {
    expect(() => assertPhoneExtension('123')).not.toThrow();
    expect(() => assertPhoneExtension('ext 123')).toThrow(TypeError);
  });
});

describe('RFC 3966', () => {
  it('parses a global tel URI into extension-free Phone Value plus extension', () => {
    expect(parseRfc3966('tel:+1-202-555-0123;ext=456')).toEqual({
      extension: '456',
      value: '+12025550123',
    });
  });

  it('parses a tel URI without an extension', () => {
    expect(parseRfc3966('tel:+442079460018')).toEqual({
      extension: undefined,
      value: '+442079460018',
    });
  });

  it('honors RFC case-insensitivity and normalizes extension visual separators', () => {
    expect(parseRfc3966('TEL:+1-202-555-0123;EXT=4-5-6')).toEqual({
      extension: '456',
      value: '+12025550123',
    });
  });

  it('resolves a local telephone URI with a global phone-context', () => {
    expect(parseRfc3966('tel:7042;phone-context=+1-914-555;ext=99')).toEqual({
      extension: '99',
      value: '+19145557042',
    });
  });

  it.each([
    'tel:+12025550123;ext=',
    'tel:+12025550123;ext=12A',
    'tel:+12025550123;ext=1;ext=2',
    'tel:+12025550123;isub=7;ext=1',
    'https://example.com/tel:+12025550123;ext=1',
  ])('rejects malformed or unsupported telephone URI %s', (uri) => {
    expect(parseRfc3966(uri)).toBeNull();
  });

  it('serializes canonical values without adding an extension to Phone Value', () => {
    expect(serializeRfc3966('+12025550123', '456')).toBe('tel:+12025550123;ext=456');
    expect(serializeRfc3966('+12025550123', undefined)).toBe('tel:+12025550123');
  });
});

describe('Extension-bearing text import', () => {
  it('uses libphonenumber-js to split a formatted international number and extension', () => {
    expect(parsePhoneExtensionBearingText('+44 20 7946 0018 ext. 456')).toEqual({
      extension: '456',
      value: '+442079460018',
    });
  });

  it('uses selected-country context for a national number', () => {
    expect(parsePhoneExtensionBearingText('(415) 555-2671 x77', 'US')).toEqual({
      extension: '77',
      value: '+14155552671',
    });
  });

  it('rejects trailing malformed extension text instead of truncating it', () => {
    expect(parsePhoneExtensionBearingText('+44 20 7946 0018 ext. 45A')).toBeNull();
  });
});
