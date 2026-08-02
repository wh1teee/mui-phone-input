import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import {
  assertPhoneValue,
  isPhoneValue,
  type PhoneValue,
  parsePhoneValue,
} from '../../packages/mui-phone-input/src/phone-value';

describe('Phone Value', () => {
  it.each([undefined, '+', '+1', '+375291234567'])(
    'accepts canonical value %s',
    (value) => {
      expect(isPhoneValue(value)).toBe(true);
    },
  );

  it.each(['', '375291234567', '+375 29', '++375', null, 375])(
    'rejects non-canonical value %s',
    (value) => {
      expect(isPhoneValue(value)).toBe(false);
    },
  );

  it('normalizes a display-like international candidate', () => {
    expect(parsePhoneValue('+375 (29) 123-45-67')).toBe('+375291234567');
  });

  it('normalizes Unicode decimal digits and adds the leading plus', () => {
    expect(parsePhoneValue('١٢٣')).toBe('+123');
    expect(parsePhoneValue('۱۲۳')).toBe('+123');
    expect(parsePhoneValue('１２３')).toBe('+123');
  });

  it('maps an empty string and undefined to the empty field state', () => {
    expect(parsePhoneValue('')).toBeUndefined();
    expect(parsePhoneValue('   ')).toBeUndefined();
    expect(parsePhoneValue(undefined)).toBeUndefined();
  });

  it.each(['+1abc', 'tel:+12025550123', '+1;ext=12', '++1'])(
    'rejects unsupported syntax %s',
    (value) => {
      expect(() => parsePhoneValue(value)).toThrow(TypeError);
    },
  );

  it('asserts and narrows a canonical value', () => {
    const value: unknown = '+12025550123';

    assertPhoneValue(value);
    const phoneValue: PhoneValue = value;

    expect(phoneValue).toBe('+12025550123');
  });

  it('throws for a non-canonical asserted value', () => {
    expect(() => assertPhoneValue('+1 202')).toThrow(TypeError);
  });

  it('normalizes generated digit/separator sequences to a canonical value', () => {
    const digit = fc.integer({ min: 0, max: 9 }).map(String);
    const separator = fc.constantFrom(' ', '(', ')', '.', '-', '–', '—');

    fc.assert(
      fc.property(
        fc.array(fc.oneof(digit, separator), { maxLength: 80 }),
        fc.boolean(),
        (characters, includePlus) => {
          const input = `${includePlus ? '+' : ''}${characters.join('')}`;
          const expectedDigits = characters
            .filter((character) => /\d/u.test(character))
            .join('');
          const expected =
            expectedDigits.length > 0 || includePlus ? `+${expectedDigits}` : undefined;

          expect(parsePhoneValue(input)).toBe(expected);
        },
      ),
    );
  });
});
