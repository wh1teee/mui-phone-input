import { describe, expect, it } from 'vitest';

import {
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
  selectPhoneCountryValue,
} from '../../packages/mui-phone-input/src/country-selector';

describe('country selector data', () => {
  const options = createPhoneCountryOptions({
    locale: 'be',
    preferredCountries: ['BY', 'PL', 'LT', 'BY'],
    resolveCountryName: (country, locale) => {
      if (locale === 'be' && country === 'BY') {
        return 'Беларусь';
      }
      return undefined;
    },
  });

  it('searches localized and English names, ISO and calling codes', () => {
    for (const query of ['бел', 'belarus', 'BY', '+375', '375']) {
      expect(filterPhoneCountryOptions(options, query)[0]?.country).toBe('BY');
    }
  });

  it('keeps preferred countries first and includes every country once', () => {
    expect(options.slice(0, 3).map((option) => option.country)).toEqual([
      'BY',
      'PL',
      'LT',
    ]);
    expect(options.filter((option) => option.country === 'BY')).toHaveLength(1);
  });

  it('supports country filtering and replaceable ordering', () => {
    const filtered = createPhoneCountryOptions({
      countryFilter: (country) => ['BY', 'LT', 'PL'].includes(country),
      countryOrder: (left, right) => right.country.localeCompare(left.country),
    });

    expect(filtered.map((option) => option.country)).toEqual(['PL', 'LT', 'BY']);
  });

  it('bounds results without hiding the active country', () => {
    const selected = filterPhoneCountryOptions(options, '', {
      limit: 2,
      selectedCountry: 'LT',
    });

    expect(selected).toHaveLength(3);
    expect(selected.map((option) => option.country)).toEqual(['BY', 'PL', 'LT']);
  });

  it('rejects unsupported countries and invalid result limits', () => {
    expect(() =>
      createPhoneCountryOptions({ preferredCountries: ['XX' as never] }),
    ).toThrow(/Unsupported preferred country/u);
    expect(() => filterPhoneCountryOptions(options, '', { limit: 0 })).toThrow(
      /positive integer/u,
    );
  });
});

describe('country selection transaction', () => {
  it('starts an empty value with the selected country calling code', () => {
    expect(selectPhoneCountryValue(undefined, 'BY')).toBe('+375');
    expect(selectPhoneCountryValue('+', 'CA')).toBe('+1');
  });

  it('preserves compatible national digits when changing calling code', () => {
    expect(selectPhoneCountryValue('+12025550123', 'BY')).toBe('+3752025550123');
  });

  it('falls back to the calling code when shared-code digits conflict', () => {
    expect(selectPhoneCountryValue('+12025550123', 'CA')).toBe('+1');
  });
});
