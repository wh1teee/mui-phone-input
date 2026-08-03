import mobileExamples from 'libphonenumber-js/examples.mobile.json';
import { isPossiblePhoneNumber, type MetadataJson } from 'libphonenumber-js/core';
import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js/max';
import maxMetadata from 'libphonenumber-js/metadata.max.json';
import { describe, expect, it } from 'vitest';

import {
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
  resolvePhoneCountrySelection,
  selectPhoneCountryValue,
} from '../../packages/mui-phone-input/src/country-selector';

function metadataForCountry(country: CountryCode): MetadataJson {
  const callingCode = getCountryCallingCode(country);
  const countryMetadata = maxMetadata.countries[country];
  expect(countryMetadata).toBeDefined();

  return {
    version: maxMetadata.version,
    country_calling_codes: { [callingCode]: [country] },
    countries: { [country]: countryMetadata! },
    nonGeographic: {},
  };
}

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

  it('replaces unfinished international calling-code prefixes', () => {
    for (const value of ['+3', '+37', '+87'] as const) {
      expect(resolvePhoneCountrySelection(value, 'BY')).toMatchObject({
        candidateValue: '+375',
        country: 'BY',
        previousValue: value,
        reason: 'partial-calling-code-replaced',
        status: 'applied',
        value: '+375',
      });
      expect(selectPhoneCountryValue(value, 'BY')).toBe('+375');
    }

    expect(selectPhoneCountryValue('+375', 'BY')).toBe('+375');
    expect(selectPhoneCountryValue('+37529', 'BY')).toBe('+37529');
    expect(selectPhoneCountryValue('+12', 'BY')).toBe('+3752');
  });

  it('preserves compatible national digits when changing calling code', () => {
    expect(selectPhoneCountryValue('+24740123', 'DE')).toBe('+4940123');
  });

  it('preserves the draft and exposes a typed shared-code conflict', () => {
    expect(resolvePhoneCountrySelection('+12025550123', 'CA')).toMatchObject({
      candidateValue: '+12025550123',
      country: 'CA',
      numberingPlan: { resolvedCountry: 'US', selectedCountry: null },
      previousNumberingPlan: { resolvedCountry: 'US', selectedCountry: null },
      previousValue: '+12025550123',
      reason: 'incompatible-draft',
      status: 'conflict',
      value: '+12025550123',
    });
    expect(selectPhoneCountryValue('+12025550123', 'CA')).toBe('+12025550123');
  });

  it('rejects an impossible complete target-country conversion', () => {
    expect(resolvePhoneCountrySelection('+24740123', 'AZ')).toMatchObject({
      candidateValue: '+99440123',
      country: 'AZ',
      previousValue: '+24740123',
      reason: 'impossible-target-draft',
      status: 'conflict',
      value: '+24740123',
    });
    expect(selectPhoneCountryValue('+24740123', 'AZ')).toBe('+24740123');
  });

  it('keeps an incomplete source draft when the target can still be completed', () => {
    expect(resolvePhoneCountrySelection('+2474', 'AZ')).toMatchObject({
      candidateValue: '+9944',
      country: 'AZ',
      reason: 'national-digits-preserved',
      status: 'applied',
      value: '+9944',
    });
  });

  it('keeps the historical US to Belarus reproduction recoverable', () => {
    expect(resolvePhoneCountrySelection('+12025550123', 'BY')).toMatchObject({
      candidateValue: '+3752025550123',
      country: 'BY',
      previousValue: '+12025550123',
      reason: 'incompatible-draft',
      status: 'conflict',
      value: '+12025550123',
    });
  });

  it('preserves complete non-geographic drafts as an explicit conflict', () => {
    expect(resolvePhoneCountrySelection('+80012345678', 'BY')).toMatchObject({
      country: 'BY',
      previousValue: '+80012345678',
      reason: 'non-geographic-draft',
      status: 'conflict',
      value: '+80012345678',
    });
  });

  it('proves every authority example pair avoids a bare-calling-code collapse', () => {
    const countries = getCountries().filter((country) =>
      Boolean(getExampleNumber(country, mobileExamples)),
    );
    let pairCount = 0;
    let appliedCount = 0;
    let conflictCount = 0;

    for (const sourceCountry of countries) {
      const sourceValue = getExampleNumber(sourceCountry, mobileExamples)?.number;
      expect(sourceValue).toBeDefined();

      for (const targetCountry of countries) {
        pairCount += 1;
        const result = resolvePhoneCountrySelection(
          sourceValue as `+${string}`,
          targetCountry,
        );
        const bareCallingCode = `+${getCountryCallingCode(targetCountry)}`;

        if (result.status === 'conflict') {
          conflictCount += 1;
          expect(result.value).toBe(sourceValue);
        } else {
          appliedCount += 1;
          expect(result.value).not.toBe(bareCallingCode);
          expect(
            isPossiblePhoneNumber(result.value, metadataForCountry(targetCountry)),
          ).toBe(true);
        }
      }
    }

    expect(pairCount).toBe(60_025);
    expect(appliedCount).toBe(7_433);
    expect(conflictCount).toBe(52_592);
  }, 15_000);
});
