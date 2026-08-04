import mobileExamples from 'libphonenumber-js/examples.mobile.json';
import { isPossiblePhoneNumber, type MetadataJson } from 'libphonenumber-js/core';
import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
} from 'libphonenumber-js/max';
import maxMetadata from 'libphonenumber-js/metadata.max.json';
import { describe, expect, it, vi } from 'vitest';

import {
  createPhoneCountryOptions,
  filterPhoneCountryOptions,
  resolvePhoneCountrySelection,
  selectPhoneCountryValue,
} from '../../packages/mui-phone-input/src/country-selector';

const REPRESENTATIVE_COLLATION_LOCALES = [
  'sv',
  'en',
  'be',
  'tr',
  'az',
  'lt',
  'el',
  'ja',
  'ar',
].filter((locale) => Intl.Collator.supportedLocalesOf([locale]).length > 0);

function compareCountryCodes(left: CountryCode, right: CountryCode): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sortWithReferenceCollator(
  options: readonly ReturnType<typeof createPhoneCountryOptions>[number][],
  locale: string,
): CountryCode[] {
  const collator = new Intl.Collator(locale);
  return [...options]
    .sort(
      (left, right) =>
        collator.compare(left.localizedName, right.localizedName) ||
        compareCountryCodes(left.country, right.country),
    )
    .map((option) => option.country);
}

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

  it('normalizes every phone-entry decimal script for calling-code search', () => {
    const asciiResult = filterPhoneCountryOptions(options, '+375').map(
      (option) => option.country,
    );

    for (const query of ['+375', '+٣٧٥', '+۳۷۵', '+३७५', '+３７５']) {
      expect(
        filterPhoneCountryOptions(options, query).map((option) => option.country),
      ).toEqual(asciiResult);
      expect(filterPhoneCountryOptions(options, query)[0]?.country).toBe('BY');
    }
  });

  it('normalizes mixed supported decimal scripts with and without a plus', () => {
    for (const query of ['+3٧۵', '3٧۵']) {
      expect(filterPhoneCountryOptions(options, query)[0]?.country).toBe('BY');
    }
  });

  it('does not reinterpret unsupported characters as a calling code', () => {
    expect(filterPhoneCountryOptions(options, '+٣٧٥A')).toEqual([]);
  });

  it('keeps localized name digits and ISO matching semantically separate', () => {
    const namedOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'BY',
      locale: 'ar',
      resolveCountryName: (country, locale) =>
        country === 'BY' && locale === 'ar' ? 'بيلاروس ٣٧٥' : undefined,
    });

    expect(filterPhoneCountryOptions(namedOptions, 'بيلاروس ٣٧٥')[0]?.country).toBe(
      'BY',
    );
    expect(filterPhoneCountryOptions(namedOptions, 'BY')[0]?.country).toBe('BY');
  });

  it('keeps preferred countries first and includes every country once', () => {
    expect(options.slice(0, 3).map((option) => option.country)).toEqual([
      'BY',
      'PL',
      'LT',
    ]);
    expect(options.filter((option) => option.country === 'BY')).toHaveLength(1);
  });

  it('uses explicit Swedish collation for Å and Ö country names', () => {
    const swedishNames: Partial<Record<CountryCode, string>> = {
      AT: 'Österrike',
      AX: 'Åland',
      TL: 'Östtimor',
      ZM: 'Zambia',
      ZW: 'Zimbabwe',
    };
    const swedishOptions = createPhoneCountryOptions({
      countryFilter: (country) => country in swedishNames,
      locale: 'sv',
      resolveCountryName: (country, locale) =>
        locale === 'sv' ? swedishNames[country] : undefined,
    });

    expect(swedishOptions.map((option) => option.country)).toEqual([
      'ZM',
      'ZW',
      'AX',
      'AT',
      'TL',
    ]);
  });

  it.each(REPRESENTATIVE_COLLATION_LOCALES)(
    'matches an explicit Intl.Collator(%s) reference',
    (locale) => {
      const localizedOptions = createPhoneCountryOptions({ locale });

      expect(localizedOptions.map((option) => option.country)).toEqual(
        sortWithReferenceCollator(localizedOptions, locale),
      );
    },
  );

  it('does not depend on String localeCompare or the host default locale', () => {
    const localeCompare = vi
      .spyOn(String.prototype, 'localeCompare')
      .mockImplementation(() => {
        throw new Error('host-default localeCompare must not be used');
      });

    expect(() => createPhoneCountryOptions({ locale: 'sv' })).not.toThrow();
    localeCompare.mockRestore();
  });

  it('uses an explicit ISO country-code tie break', () => {
    const tiedOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'BY' || country === 'US',
      locale: 'sv',
      resolveCountryName: () => 'Samma namn',
    });

    expect(tiedOptions.map((option) => option.country)).toEqual(['BY', 'US']);
  });

  it('keeps preferred countries and custom ordering authoritative', () => {
    const localizedOptions = createPhoneCountryOptions({
      countryFilter: (country) => ['AT', 'AX', 'ZM'].includes(country),
      countryOrder: (left, right) => compareCountryCodes(right.country, left.country),
      locale: 'sv',
      preferredCountries: ['AX'],
    });

    expect(localizedOptions.map((option) => option.country)).toEqual([
      'AX',
      'ZM',
      'AT',
    ]);
  });

  it('falls back deterministically for malformed and unsupported locales', () => {
    const englishCountries = createPhoneCountryOptions({ locale: 'en' }).map(
      (option) => option.country,
    );

    for (const locale of ['not_a_locale', 'zz-ZZ']) {
      expect(
        createPhoneCountryOptions({ locale }).map((option) => option.country),
      ).toEqual(englishCountries);
    }
  });

  it('constructs repeatably in the SSR-safe Node environment', () => {
    const first = createPhoneCountryOptions({ locale: 'sv' }).map(
      (option) => option.country,
    );
    const second = createPhoneCountryOptions({ locale: 'sv' }).map(
      (option) => option.country,
    );

    expect(second).toEqual(first);
  });

  it('uses Turkish casing for localized country-name search', () => {
    const turkishOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'KG',
      locale: 'tr',
      resolveCountryName: (country, locale) => {
        if (country !== 'KG') {
          return undefined;
        }
        return locale === 'tr'
          ? 'Kırgızistan'
          : locale === 'en'
            ? 'Kyrgyzstan'
            : undefined;
      },
    });

    for (const query of ['KIRGIZİSTAN', 'KIRgızİSTAN']) {
      expect(filterPhoneCountryOptions(turkishOptions, query)[0]?.country).toBe('KG');
    }
  });

  it('uses Azerbaijani dotted and dotless I casing', () => {
    const azerbaijaniOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'KG',
      locale: 'az',
      resolveCountryName: (country, locale) =>
        country === 'KG' && locale === 'az' ? 'Qırğızıstan' : undefined,
    });

    expect(
      filterPhoneCountryOptions(azerbaijaniOptions, 'QIRĞIZISTAN')[0]?.country,
    ).toBe('KG');
  });

  it('handles Lithuanian locale-sensitive casing before diacritic folding', () => {
    const lithuanianOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'LT',
      locale: 'lt',
      resolveCountryName: (country, locale) =>
        country === 'LT' && locale === 'lt' ? 'i\u0307\u0301lanka' : undefined,
    });

    expect(
      filterPhoneCountryOptions(lithuanianOptions, 'I\u0301LANKA')[0]?.country,
    ).toBe('LT');
  });

  it('handles Greek casing and explicit diacritic folding', () => {
    const greekOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'GR',
      locale: 'el',
      resolveCountryName: (country, locale) =>
        country === 'GR' && locale === 'el' ? 'Ελλάδα' : undefined,
    });

    expect(filterPhoneCountryOptions(greekOptions, 'ΕΛΛΑΔΑ')[0]?.country).toBe('GR');
  });

  it('keeps stable English fallback search under a non-English locale', () => {
    const turkishOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'KG',
      locale: 'tr',
      resolveCountryName: (country, locale) => {
        if (country !== 'KG') {
          return undefined;
        }
        return locale === 'tr'
          ? 'Kırgızistan'
          : locale === 'en'
            ? 'Kyrgyzstan'
            : undefined;
      },
    });

    expect(filterPhoneCountryOptions(turkishOptions, 'KYRGYZSTAN')[0]?.country).toBe(
      'KG',
    );
  });

  it('keeps ISO and localized calling-code rank precedence unchanged', () => {
    const rankedOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'BY' || country === 'US',
      locale: 'tr',
      resolveCountryName: (country, locale) => {
        if (locale !== 'tr') {
          return undefined;
        }
        return country === 'BY' ? 'Byland' : 'BY 375 ülkesi';
      },
    });

    expect(
      filterPhoneCountryOptions(rankedOptions, 'BY').map((option) => option.country),
    ).toEqual(['BY', 'US']);
    expect(
      filterPhoneCountryOptions(rankedOptions, '+٣٧٥').map((option) => option.country),
    ).toEqual(['BY']);
  });

  it('recomputes localized and English query keys for every query', () => {
    const changingQueryOptions = createPhoneCountryOptions({
      countryFilter: (country) => country === 'BY' || country === 'KG',
      locale: 'tr',
      resolveCountryName: (country, locale) => {
        if (locale === 'tr') {
          return country === 'KG' ? 'Kırgızistan' : 'Belarus';
        }
        if (locale === 'en') {
          return country === 'KG' ? 'Kyrgyzstan' : 'Belarus';
        }
        return undefined;
      },
    });

    expect(
      filterPhoneCountryOptions(changingQueryOptions, 'KIRGIZİSTAN')[0]?.country,
    ).toBe('KG');
    expect(
      filterPhoneCountryOptions(changingQueryOptions, 'KYRGYZSTAN')[0]?.country,
    ).toBe('KG');
    expect(filterPhoneCountryOptions(changingQueryOptions, 'BY')[0]?.country).toBe(
      'BY',
    );
    expect(filterPhoneCountryOptions(changingQueryOptions, '+۳۷۵')[0]?.country).toBe(
      'BY',
    );
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
