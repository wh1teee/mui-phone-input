import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumber,
} from 'libphonenumber-js/max';
import { describe, expect, it } from 'vitest';

function countriesForCallingCode(callingCode: string): string[] {
  return getCountries().filter(
    (country) => getCountryCallingCode(country) === callingCode,
  );
}

describe('input-engine shared numbering policy', () => {
  it.each([
    ['1', ['CA', 'US']],
    ['7', ['KZ', 'RU']],
    ['44', ['GB', 'GG', 'IM', 'JE']],
  ])(
    'keeps +%s unresolved while multiple countries remain possible',
    (code, expected) => {
      const countries = countriesForCallingCode(code);

      expect(countries.length).toBeGreaterThan(1);
      expect(countries).toEqual(expect.arrayContaining(expected));
    },
  );

  it('does not assign a country to a non-geographic numbering plan', () => {
    const number = parsePhoneNumber('+80012345678');

    expect(number.country).toBeUndefined();
    expect(number.countryCallingCode).toBe('800');
    expect(number.isNonGeographic()).toBe(true);
  });
});
