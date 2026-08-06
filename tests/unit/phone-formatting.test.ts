import { describe, expect, test } from 'vitest';
import minMetadata from 'libphonenumber-js/metadata.min.json';

import {
  type FormatStrategy,
  formatPhoneInputPresentation,
  validatePhoneMetadata,
} from '../../packages/mui-phone-input/src';

describe('phone formatting', () => {
  test('presents one canonical value in international, national, and fixed-calling-code modes', () => {
    const value = '+12025550123' as const;

    expect(formatPhoneInputPresentation(value).displayValue).toBe('+1 202 555 0123');
    expect(
      formatPhoneInputPresentation(value, {
        country: 'US',
        displayMode: 'national',
      }).displayValue,
    ).toBe('(202) 555-0123');
    expect(
      formatPhoneInputPresentation(value, {
        country: 'US',
        displayMode: 'international-fixed-calling-code',
      }).displayValue,
    ).toBe('+1 202 555 0123');
  });

  test('applies a declarative display mask and falls back to authority formatting when it cannot fit', () => {
    const value = '+12025550123' as const;
    const masked = formatPhoneInputPresentation(value, {
      displayMask: { pattern: '+ # (###) ###-####' },
    });

    expect(masked.value).toBe(value);
    expect(masked.displayValue).toBe('+ 1 (202) 555-0123');
    expect(
      formatPhoneInputPresentation(value, {
        displayMask: { pattern: '###' },
      }).displayValue,
    ).toBe('+1 202 555 0123');
  });

  test('requires a typed strategy to preserve digits and provide a valid logical-caret map', () => {
    const strategy: FormatStrategy = ({ automatic }) => ({
      displayValue: automatic.displayValue.replaceAll(' ', '.'),
      logicalCaretPositions: automatic.logicalCaretPositions,
    });

    expect(
      formatPhoneInputPresentation('+1202555', { formatStrategy: strategy }).displayValue,
    ).toBe('+1.202.555');
    expect(() =>
      formatPhoneInputPresentation('+1202555', {
        formatStrategy: () => ({
          displayValue: '+1 202 999',
          logicalCaretPositions: [1],
        }),
      }),
    ).toThrow(/Format Strategy.*digits/u);
  });

  test('fails fast for invalid mask and strategy configuration', () => {
    expect(() =>
      formatPhoneInputPresentation('+1202555', {
        displayMask: { pattern: '+1 (###)' },
      }),
    ).toThrow(/Invalid Display Mask/u);
    expect(() =>
      formatPhoneInputPresentation('+1202555', {
        displayMask: { pattern: '(---)' },
      }),
    ).toThrow(/Invalid Display Mask/u);
    expect(() =>
      formatPhoneInputPresentation('+1202555', {
        displayMask: { pattern: '+ # ### ###' },
        formatStrategy: ({ automatic }) => automatic,
      }),
    ).toThrow(/either displayMask or formatStrategy/u);
    expect(() =>
      formatPhoneInputPresentation('+1202555', {
        formatStrategy: ({ automatic }) => ({
          displayValue: automatic.displayValue,
          logicalCaretPositions: [automatic.displayValue.length],
        }),
      }),
    ).toThrow(/logical caret positions/u);
  });

  test('falls back to international authority formatting when national mode is incompatible with the selected country', () => {
    expect(
      formatPhoneInputPresentation('+442079460958', {
        country: 'US',
        displayMode: 'national',
      }).displayValue,
    ).toBe('+44 20 7946 0958');
  });

  test('formats through caller-provided libphonenumber metadata authority', () => {
    const metadata = validatePhoneMetadata(minMetadata);

    expect(
      formatPhoneInputPresentation('+12025550123', {
        country: 'US',
        displayMode: 'national',
        metadata,
      }).displayValue,
    ).toBe('(202) 555-0123');
  });
});
