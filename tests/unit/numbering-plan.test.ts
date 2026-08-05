import fc from 'fast-check';
import mobileExamples from 'libphonenumber-js/examples.mobile.json';
import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max';
import { describe, expect, it } from 'vitest';

import {
  type NumberingPlanResolution,
  resolveCompleteNationalPhoneValue,
  resolveNumberingPlan,
} from '../../packages/mui-phone-input/src/numbering-plan';
import type { PhoneValue } from '../../packages/mui-phone-input/src/phone-value';

function expectSerializableResolution(resolution: NumberingPlanResolution) {
  expect(JSON.parse(JSON.stringify(resolution))).toEqual(resolution);
}

describe('resolveCompleteNationalPhoneValue', () => {
  it('uses the selected country as the sole authority for a complete national number', () => {
    expect(resolveCompleteNationalPhoneValue('2025550123', 'US')).toBe('+12025550123');
    expect(resolveCompleteNationalPhoneValue('(202) 555-0123', 'US')).toBe(
      '+12025550123',
    );
  });

  it('resolves every pinned authority mobile example from its national component', () => {
    const countriesWithExamples = getCountries().filter((country) =>
      Boolean(getExampleNumber(country, mobileExamples)),
    );

    expect(countriesWithExamples).toHaveLength(245);

    for (const country of countriesWithExamples) {
      const example = getExampleNumber(country, mobileExamples);
      expect(example).toBeDefined();

      expect(
        resolveCompleteNationalPhoneValue(example!.nationalNumber, country),
        `${country} national autofill did not preserve its authority example`,
      ).toBe(example!.number);
    }
  });

  it.each(['AX', 'BL', 'CC', 'CX', 'EH', 'IM', 'MF', 'SJ', 'VA'] as const)(
    'preserves explicit territory authority for %s when global detection uses a parent plan',
    (country) => {
      const example = getExampleNumber(country, mobileExamples);
      expect(example).toBeDefined();
      expect(
        parsePhoneNumberFromString(example!.nationalNumber, country)?.country,
      ).not.toBe(country);

      expect(resolveCompleteNationalPhoneValue(example!.nationalNumber, country)).toBe(
        example!.number,
      );
    },
  );

  it.each([
    { country: 'US', expected: '+12005550123', national: '2005550123' },
    { country: 'BY', expected: '+375201234567', national: '201234567' },
  ] as const)(
    'keeps possible-but-not-valid $country values inside the default possibility policy',
    ({ country, expected, national }) => {
      const phoneNumber = parsePhoneNumberFromString(national, country);
      expect(phoneNumber?.number).toBe(expected);
      expect(phoneNumber?.isPossible()).toBe(true);
      expect(phoneNumber?.isValid()).toBe(false);

      expect(resolveCompleteNationalPhoneValue(national, country)).toBe(expected);
    },
  );

  it('rejects structurally impossible national candidates', () => {
    expect(resolveCompleteNationalPhoneValue('123', 'US')).toBeNull();
    expect(resolveCompleteNationalPhoneValue('1234567890123456', 'US')).toBeNull();
    expect(resolveCompleteNationalPhoneValue('12', 'BY')).toBeNull();
  });

  it('rejects international, malformed, and empty input', () => {
    expect(resolveCompleteNationalPhoneValue('+12025550123', 'US')).toBeNull();
    expect(resolveCompleteNationalPhoneValue('phone: 2025550123', 'US')).toBeNull();
    expect(resolveCompleteNationalPhoneValue('202+5550123', 'US')).toBeNull();
    expect(resolveCompleteNationalPhoneValue('', 'US')).toBeNull();
    expect(resolveCompleteNationalPhoneValue('   ', 'US')).toBeNull();
  });

  it('normalizes supported Unicode decimal digits in national autofill', () => {
    expect(resolveCompleteNationalPhoneValue('２０２５５５０１２３', 'US')).toBe(
      '+12025550123',
    );
    expect(resolveCompleteNationalPhoneValue('٢٠٢٥٥٥٠١٢٣', 'US')).toBe('+12025550123');
  });
});

describe('resolveNumberingPlan', () => {
  it('keeps a shared +1 calling code unresolved without explicit selection', () => {
    const resolution = resolveNumberingPlan('+1');

    expect(resolution).toEqual({
      countryCallingCode: '1',
      detectedCountry: null,
      kind: 'unresolved',
      possibleCountries: expect.arrayContaining(['CA', 'US']),
      resolvedCountry: null,
      selectedCountry: null,
    });
    expect(resolution.possibleCountries).toHaveLength(25);
    expectSerializableResolution(resolution);
  });

  it('keeps an explicitly selected shared-code country authoritative while compatible', () => {
    expect(resolveNumberingPlan('+1', { selectedCountry: 'CA' })).toMatchObject({
      countryCallingCode: '1',
      detectedCountry: null,
      kind: 'geographic',
      resolvedCountry: 'CA',
      selectedCountry: 'CA',
    });
    expect(resolveNumberingPlan('+7', { selectedCountry: 'KZ' })).toEqual({
      countryCallingCode: '7',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: ['KZ', 'RU'],
      resolvedCountry: 'KZ',
      selectedCountry: 'KZ',
    });
    expect(resolveNumberingPlan('+44', { selectedCountry: 'GG' })).toEqual({
      countryCallingCode: '44',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: ['GB', 'GG', 'IM', 'JE'],
      resolvedCountry: 'GG',
      selectedCountry: 'GG',
    });
    expect(resolveNumberingPlan('+12015550', { selectedCountry: 'US' })).toEqual({
      countryCallingCode: '1',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: ['CA', 'US'],
      resolvedCountry: 'US',
      selectedCountry: 'US',
    });
  });

  it('drops an incompatible selection when the digits detect another country', () => {
    expect(resolveNumberingPlan('+70', { selectedCountry: 'KZ' })).toEqual({
      countryCallingCode: '7',
      detectedCountry: null,
      kind: 'unresolved',
      possibleCountries: ['KZ', 'RU'],
      resolvedCountry: null,
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+12025550123', { selectedCountry: 'CA' })).toEqual({
      countryCallingCode: '1',
      detectedCountry: 'US',
      kind: 'geographic',
      possibleCountries: ['US'],
      resolvedCountry: 'US',
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+74951234567', { selectedCountry: 'KZ' })).toEqual({
      countryCallingCode: '7',
      detectedCountry: 'RU',
      kind: 'geographic',
      possibleCountries: ['RU'],
      resolvedCountry: 'RU',
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+442079460958', { selectedCountry: 'GG' })).toEqual({
      countryCallingCode: '44',
      detectedCountry: 'GB',
      kind: 'geographic',
      possibleCountries: ['GB'],
      resolvedCountry: 'GB',
      selectedCountry: null,
    });
  });

  it('preserves every explicit country supported by authority mobile examples', () => {
    const countriesWithExamples = getCountries().filter((country) =>
      Boolean(getExampleNumber(country, mobileExamples)),
    );

    expect(countriesWithExamples).toHaveLength(245);

    for (const country of countriesWithExamples) {
      const example = getExampleNumber(country, mobileExamples);
      expect(example).toBeDefined();
      const value = example?.number as PhoneValue;

      expect(resolveNumberingPlan(value, { selectedCountry: country })).toMatchObject({
        kind: 'geographic',
        resolvedCountry: country,
        selectedCountry: country,
      });
    }
  });

  it('preserves every compatible explicit country throughout every authority example prefix', () => {
    const countriesWithExamples = getCountries().filter((country) =>
      Boolean(getExampleNumber(country, mobileExamples)),
    );
    let prefixCount = 0;

    expect(countriesWithExamples).toHaveLength(245);

    for (const country of countriesWithExamples) {
      const example = getExampleNumber(country, mobileExamples);
      expect(example).toBeDefined();

      const firstPrefixLength = getCountryCallingCode(country).length + 1;
      for (
        let length = firstPrefixLength;
        length <= example!.number.length;
        length += 1
      ) {
        const value = example!.number.slice(0, length) as PhoneValue;
        const resolution = resolveNumberingPlan(value, { selectedCountry: country });
        prefixCount += 1;

        expect(
          resolution.selectedCountry,
          `${country} selection was lost for compatible prefix ${value}`,
        ).toBe(country);
        expect(
          resolution.resolvedCountry,
          `${country} resolution was lost for compatible prefix ${value}`,
        ).toBe(country);
        expect(
          resolution.possibleCountries,
          `${country} was missing from possibleCountries for compatible prefix ${value}`,
        ).toContain(country);
      }
    }

    expect(prefixCount).toBe(2_348);
  });

  it('keeps every claimed geographic country inside possibleCountries', () => {
    const countriesWithExamples = getCountries().filter((country) =>
      Boolean(getExampleNumber(country, mobileExamples)),
    );

    for (const country of countriesWithExamples) {
      const example = getExampleNumber(country, mobileExamples);
      expect(example).toBeDefined();
      const resolution = resolveNumberingPlan(example!.number as PhoneValue, {
        selectedCountry: country,
      });

      expect(resolution.kind).toBe('geographic');
      expect(resolution.possibleCountries).toContain(resolution.resolvedCountry);
      expect(resolution.possibleCountries).toContain(resolution.selectedCountry);
    }
  });

  it('resolves single-country and territory plans directly from authority data', () => {
    expect(resolveNumberingPlan('+375')).toEqual({
      countryCallingCode: '375',
      detectedCountry: 'BY',
      kind: 'geographic',
      possibleCountries: ['BY'],
      resolvedCountry: 'BY',
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+441624123456')).toEqual({
      countryCallingCode: '44',
      detectedCountry: 'IM',
      kind: 'geographic',
      possibleCountries: ['IM'],
      resolvedCountry: 'IM',
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+447781123456')).toEqual({
      countryCallingCode: '44',
      detectedCountry: 'GG',
      kind: 'geographic',
      possibleCountries: ['GG'],
      resolvedCountry: 'GG',
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+441534123456')).toEqual({
      countryCallingCode: '44',
      detectedCountry: 'JE',
      kind: 'geographic',
      possibleCountries: ['JE'],
      resolvedCountry: 'JE',
      selectedCountry: null,
    });
  });

  it('represents non-geographic numbering plans without any country', () => {
    expect(resolveNumberingPlan('+800')).toEqual({
      countryCallingCode: '800',
      detectedCountry: null,
      kind: 'non-geographic',
      possibleCountries: [],
      resolvedCountry: null,
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+80012345678', { selectedCountry: 'US' })).toEqual({
      countryCallingCode: '800',
      detectedCountry: null,
      kind: 'non-geographic',
      possibleCountries: [],
      resolvedCountry: null,
      selectedCountry: null,
    });
    expect(resolveNumberingPlan('+870773111632')).toEqual({
      countryCallingCode: '870',
      detectedCountry: null,
      kind: 'non-geographic',
      possibleCountries: [],
      resolvedCountry: null,
      selectedCountry: null,
    });
  });

  it('uses explicit selection before a calling code is complete only while its prefix is compatible', () => {
    expect(resolveNumberingPlan(undefined, { selectedCountry: 'BY' })).toEqual({
      countryCallingCode: '375',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: ['BY'],
      resolvedCountry: 'BY',
      selectedCountry: 'BY',
    });
    expect(resolveNumberingPlan('+3', { selectedCountry: 'BY' })).toEqual({
      countryCallingCode: '375',
      detectedCountry: null,
      kind: 'geographic',
      possibleCountries: ['BY'],
      resolvedCountry: 'BY',
      selectedCountry: 'BY',
    });
    expect(resolveNumberingPlan('+4', { selectedCountry: 'BY' })).toEqual({
      countryCallingCode: null,
      detectedCountry: null,
      kind: 'unresolved',
      possibleCountries: [],
      resolvedCountry: null,
      selectedCountry: null,
    });
  });

  it('rejects an unsupported selected country instead of inventing a plan', () => {
    expect(() =>
      resolveNumberingPlan('+1', {
        selectedCountry: 'XX' as CountryCode,
      }),
    ).toThrow(TypeError);
  });

  it('derives every possible country from the authority calling code', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          '+1',
          '+7',
          '+44',
          '+375',
          '+12025550123',
          '+77071234567',
          '+442079460958',
        ),
        (value) => {
          const resolution = resolveNumberingPlan(value);

          for (const country of resolution.possibleCountries) {
            expect(getCountryCallingCode(country)).toBe(resolution.countryCallingCode);
          }
        },
      ),
    );
  });
});
