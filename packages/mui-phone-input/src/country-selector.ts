import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
} from 'libphonenumber-js/max';

import { resolveNumberingPlan } from './numbering-plan';
import { assertPhoneValue, type PhoneValue } from './phone-value';

export interface PhoneCountryOption {
  callingCode: string;
  country: CountryCode;
  englishName: string;
  localizedName: string;
  preferred: boolean;
}

export type PhoneCountryNameResolver = (
  country: CountryCode,
  locale: string,
) => string | undefined;

export interface CreatePhoneCountryOptionsParameters {
  countryFilter?: (country: CountryCode) => boolean;
  countryOrder?: (
    left: Readonly<PhoneCountryOption>,
    right: Readonly<PhoneCountryOption>,
  ) => number;
  locale?: string;
  preferredCountries?: readonly CountryCode[];
  resolveCountryName?: PhoneCountryNameResolver;
}

export interface FilterPhoneCountryOptionsParameters {
  limit?: number;
  selectedCountry?: CountryCode | null;
}

function createDisplayNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { fallback: 'code', type: 'region' });
  } catch {
    return null;
  }
}

function resolveDisplayName(
  country: CountryCode,
  locale: string,
  resolver: PhoneCountryNameResolver | undefined,
  displayNames: Intl.DisplayNames | null,
): string | undefined {
  const resolved = resolver?.(country, locale) ?? displayNames?.of(country);
  return resolved && resolved !== country ? resolved : undefined;
}

function assertSupportedCountry(country: CountryCode, label: string): void {
  if (!isSupportedCountry(country)) {
    throw new TypeError(`Unsupported ${label} country: ${country}`);
  }
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '')
    .trim()
    .toLocaleLowerCase('en');
}

function defaultCountryOrder(
  left: Readonly<PhoneCountryOption>,
  right: Readonly<PhoneCountryOption>,
): number {
  if (left.preferred !== right.preferred) {
    return left.preferred ? -1 : 1;
  }
  return (
    left.localizedName.localeCompare(right.localizedName) ||
    left.country.localeCompare(right.country)
  );
}

export function createPhoneCountryOptions(
  parameters: CreatePhoneCountryOptionsParameters = {},
): readonly PhoneCountryOption[] {
  const locale = parameters.locale ?? 'en';
  const localizedDisplayNames = createDisplayNames(locale);
  const englishDisplayNames = createDisplayNames('en');
  const preferredCountries: CountryCode[] = [];
  const preferredSet = new Set<CountryCode>();

  for (const country of parameters.preferredCountries ?? []) {
    assertSupportedCountry(country, 'preferred');
    if (!preferredSet.has(country)) {
      preferredSet.add(country);
      preferredCountries.push(country);
    }
  }

  const options = getCountries()
    .filter((country) => parameters.countryFilter?.(country) ?? true)
    .map<PhoneCountryOption>((country) => {
      const englishName =
        resolveDisplayName(
          country,
          'en',
          parameters.resolveCountryName,
          englishDisplayNames,
        ) ?? country;
      const localizedName =
        resolveDisplayName(
          country,
          locale,
          parameters.resolveCountryName,
          localizedDisplayNames,
        ) ?? englishName;

      return Object.freeze({
        callingCode: getCountryCallingCode(country),
        country,
        englishName,
        localizedName,
        preferred: preferredSet.has(country),
      });
    });

  const order = parameters.countryOrder ?? defaultCountryOrder;
  const preferredIndex = new Map(
    preferredCountries.map((country, index) => [country, index] as const),
  );

  options.sort((left, right) => {
    const leftPreferredIndex = preferredIndex.get(left.country);
    const rightPreferredIndex = preferredIndex.get(right.country);

    if (leftPreferredIndex !== undefined || rightPreferredIndex !== undefined) {
      if (leftPreferredIndex === undefined) {
        return 1;
      }
      if (rightPreferredIndex === undefined) {
        return -1;
      }
      return leftPreferredIndex - rightPreferredIndex;
    }

    return order(left, right);
  });

  return Object.freeze(options);
}

function optionSearchRank(option: Readonly<PhoneCountryOption>, query: string): number {
  const normalizedCountry = option.country.toLocaleLowerCase('en');
  const normalizedCallingCode = normalizeSearchText(option.callingCode);
  const normalizedLocalizedName = normalizeSearchText(option.localizedName);
  const normalizedEnglishName = normalizeSearchText(option.englishName);
  const digitsQuery = query.startsWith('+') ? query.slice(1) : query;

  if (normalizedCountry === query || normalizedCallingCode === digitsQuery) {
    return 0;
  }
  if (
    normalizedLocalizedName.startsWith(query) ||
    normalizedEnglishName.startsWith(query) ||
    normalizedCountry.startsWith(query) ||
    normalizedCallingCode.startsWith(digitsQuery)
  ) {
    return 1;
  }
  if (
    normalizedLocalizedName.includes(query) ||
    normalizedEnglishName.includes(query)
  ) {
    return 2;
  }
  return Number.POSITIVE_INFINITY;
}

export function filterPhoneCountryOptions(
  options: readonly PhoneCountryOption[],
  query: string,
  parameters: FilterPhoneCountryOptionsParameters = {},
): readonly PhoneCountryOption[] {
  const limit = parameters.limit ?? 50;
  if (!Number.isInteger(limit) || limit <= 0) {
    throw new RangeError('Country selector result limit must be a positive integer.');
  }

  const normalizedQuery = normalizeSearchText(query);
  const matches = normalizedQuery
    ? options
        .map((option, index) => ({
          index,
          option,
          rank: optionSearchRank(option, normalizedQuery),
        }))
        .filter(({ rank }) => Number.isFinite(rank))
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .map(({ option }) => option)
    : [...options];
  const bounded = matches.slice(0, limit);

  if (
    parameters.selectedCountry &&
    !bounded.some((option) => option.country === parameters.selectedCountry)
  ) {
    const selected = matches.find(
      (option) => option.country === parameters.selectedCountry,
    );
    if (selected) {
      bounded.push(selected);
    }
  }

  return bounded;
}

export function selectPhoneCountryValue(
  value: PhoneValue,
  country: CountryCode,
): PhoneValue {
  assertPhoneValue(value);
  assertSupportedCountry(country, 'selected');

  const callingCode = getCountryCallingCode(country);
  const currentDigits = value?.slice(1) ?? '';
  const currentPlan = resolveNumberingPlan(value);
  const nationalDigits = currentPlan.countryCallingCode
    ? currentDigits.slice(currentPlan.countryCallingCode.length)
    : currentDigits;
  const candidate = `+${callingCode}${nationalDigits}` as PhoneValue;
  const candidatePlan = resolveNumberingPlan(candidate, { selectedCountry: country });

  return candidatePlan.selectedCountry === country
    ? candidate
    : (`+${callingCode}` as PhoneValue);
}
