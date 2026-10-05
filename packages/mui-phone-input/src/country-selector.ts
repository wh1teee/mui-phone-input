import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
} from 'libphonenumber-js/core';

import { type NumberingPlanResolution, resolveNumberingPlan } from './numbering-plan';
import { DEFAULT_PHONE_METADATA, type PhoneMetadata } from './phone-metadata';
import {
  assertPhoneValue,
  normalizePhoneInputDigit,
  type PhoneValue,
} from './phone-value';

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
  metadata?: PhoneMetadata;
  preferredCountries?: readonly CountryCode[];
  resolveCountryName?: PhoneCountryNameResolver;
}

export interface PhoneCountrySelectionOptions {
  metadata?: PhoneMetadata;
}

export interface FilterPhoneCountryOptionsParameters {
  /** Maximum rendered options. Omit to keep every match. */
  limit?: number;
  selectedCountry?: CountryCode | null;
}

interface PhoneCountrySearchMetadata {
  callingCodeKey: string;
  countryKey: string;
  // The metadata's main country for a shared calling code, e.g. US for +1.
  mainCountryForCallingCode: boolean;
  englishNameKey: string;
  locale: string;
  localizedNameKey: string;
}

export type PhoneCountrySelectionAppliedReason =
  | 'calling-code-initialized'
  | 'calling-code-preserved'
  | 'national-digits-preserved'
  | 'partial-calling-code-replaced';

interface PhoneCountrySelectionResultBase {
  candidateNumberingPlan: NumberingPlanResolution;
  candidateValue: Exclude<PhoneValue, undefined>;
  country: CountryCode;
  numberingPlan: NumberingPlanResolution;
  previousNumberingPlan: NumberingPlanResolution;
  previousValue: PhoneValue;
  value: PhoneValue;
}

export interface PhoneCountrySelectionAppliedResult
  extends PhoneCountrySelectionResultBase {
  reason: PhoneCountrySelectionAppliedReason;
  status: 'applied';
  value: Exclude<PhoneValue, undefined>;
}

export type PhoneCountrySelectionResult = PhoneCountrySelectionAppliedResult;

const authorityCallingCodesByMetadata = new WeakMap<PhoneMetadata, readonly string[]>();
const DEFAULT_INTL_LOCALE = 'en';
const COUNTRY_SEARCH_METADATA = new WeakMap<
  Readonly<PhoneCountryOption>,
  Readonly<PhoneCountrySearchMetadata>
>();

function isPartialInternationalCallingCode(
  digits: string,
  numberingPlan: NumberingPlanResolution,
  metadata: PhoneMetadata,
): boolean {
  let authorityCallingCodes = authorityCallingCodesByMetadata.get(metadata);
  if (!authorityCallingCodes) {
    authorityCallingCodes = Object.freeze([
      ...Object.keys(metadata.country_calling_codes),
      ...Object.keys(metadata.nonGeographic),
    ]);
    authorityCallingCodesByMetadata.set(metadata, authorityCallingCodes);
  }
  return (
    numberingPlan.countryCallingCode === null &&
    digits.length > 0 &&
    authorityCallingCodes.some(
      (callingCode) =>
        callingCode.length > digits.length && callingCode.startsWith(digits),
    )
  );
}

function createDisplayNames(locale: string): Intl.DisplayNames | null {
  try {
    return new Intl.DisplayNames([locale], { fallback: 'code', type: 'region' });
  } catch {
    return null;
  }
}

function resolveIntlLocale(locale: string): string {
  try {
    return (
      Intl.Collator.supportedLocalesOf([locale], { localeMatcher: 'lookup' })[0] ??
      DEFAULT_INTL_LOCALE
    );
  } catch {
    return DEFAULT_INTL_LOCALE;
  }
}

function resolveCaseLocale(locale: string): string {
  try {
    return Intl.getCanonicalLocales([locale])[0] ?? DEFAULT_INTL_LOCALE;
  } catch {
    return DEFAULT_INTL_LOCALE;
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

function assertSupportedCountry(
  country: CountryCode,
  label: string,
  metadata: PhoneMetadata,
): void {
  if (!isSupportedCountry(country, metadata)) {
    throw new TypeError(`Unsupported ${label} country: ${country}`);
  }
}

function normalizeNameSearchText(value: string, locale: string): string {
  return value
    .trim()
    .toLocaleLowerCase(locale)
    .normalize('NFKD')
    .replace(/\p{Mark}/gu, '');
}

function normalizeCallingCodeSearchQuery(value: string): string | null {
  let digits = '';
  let hasLeadingPlus = false;

  for (const character of value.trim()) {
    if (!hasLeadingPlus && digits.length === 0 && character.normalize('NFKC') === '+') {
      hasLeadingPlus = true;
      continue;
    }

    const digit = normalizePhoneInputDigit(character);
    if (digit === undefined) {
      return null;
    }
    digits += digit;
  }

  return digits;
}

function compareCountryCodes(left: CountryCode, right: CountryCode): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function createCountrySearchMetadata(
  option: Readonly<PhoneCountryOption>,
  locale: string,
  mainCountryForCallingCode = false,
): Readonly<PhoneCountrySearchMetadata> {
  return Object.freeze({
    callingCodeKey: normalizeCallingCodeSearchQuery(option.callingCode) ?? '',
    countryKey: option.country.toLowerCase(),
    mainCountryForCallingCode,
    englishNameKey: normalizeNameSearchText(option.englishName, DEFAULT_INTL_LOCALE),
    locale,
    localizedNameKey: normalizeNameSearchText(option.localizedName, locale),
  });
}

function getCountrySearchMetadata(
  option: Readonly<PhoneCountryOption>,
): Readonly<PhoneCountrySearchMetadata> {
  return (
    COUNTRY_SEARCH_METADATA.get(option) ??
    createCountrySearchMetadata(option, DEFAULT_INTL_LOCALE)
  );
}

function createDefaultCountryOrder(
  locale: string,
): NonNullable<CreatePhoneCountryOptionsParameters['countryOrder']> {
  const collator = new Intl.Collator(locale);

  return (left, right) => {
    if (left.preferred !== right.preferred) {
      return left.preferred ? -1 : 1;
    }
    return (
      collator.compare(left.localizedName, right.localizedName) ||
      compareCountryCodes(left.country, right.country)
    );
  };
}

export function createPhoneCountryOptions(
  parameters: CreatePhoneCountryOptionsParameters = {},
): readonly PhoneCountryOption[] {
  const metadata = parameters.metadata ?? DEFAULT_PHONE_METADATA;
  const requestedLocale = parameters.locale ?? DEFAULT_INTL_LOCALE;
  const intlLocale = resolveIntlLocale(requestedLocale);
  const caseLocale = resolveCaseLocale(requestedLocale);
  const localizedDisplayNames = createDisplayNames(intlLocale);
  const englishDisplayNames = createDisplayNames(DEFAULT_INTL_LOCALE);
  const preferredCountries: CountryCode[] = [];
  const preferredSet = new Set<CountryCode>();

  for (const country of parameters.preferredCountries ?? []) {
    assertSupportedCountry(country, 'preferred', metadata);
    if (!preferredSet.has(country)) {
      preferredSet.add(country);
      preferredCountries.push(country);
    }
  }

  const options = getCountries(metadata)
    .filter((country) => parameters.countryFilter?.(country) ?? true)
    .map<PhoneCountryOption>((country) => {
      const englishName =
        resolveDisplayName(
          country,
          DEFAULT_INTL_LOCALE,
          parameters.resolveCountryName,
          englishDisplayNames,
        ) ?? country;
      const localizedName =
        resolveDisplayName(
          country,
          requestedLocale,
          parameters.resolveCountryName,
          localizedDisplayNames,
        ) ?? englishName;

      const option = Object.freeze({
        callingCode: getCountryCallingCode(country, metadata),
        country,
        englishName,
        localizedName,
        preferred: preferredSet.has(country),
      });
      COUNTRY_SEARCH_METADATA.set(
        option,
        createCountrySearchMetadata(
          option,
          caseLocale,
          metadata.country_calling_codes[option.callingCode]?.[0] === country,
        ),
      );
      return option;
    });

  const order = parameters.countryOrder ?? createDefaultCountryOrder(intlLocale);
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

// Ordered by population (official national estimates compiled by Wikipedia's
// "List of countries and dependencies by population", retrieved 2026-10-04).
// Population is a neutral, verifiable proxy for how often a country is needed;
// applications with a known audience should pass their own preferred countries.
const POPULAR_COUNTRIES = Object.freeze([
  'IN',
  'CN',
  'US',
  'ID',
  'PK',
  'NG',
  'BR',
  'BD',
  'RU',
  'MX',
  'JP',
  'CD',
  'PH',
  'ET',
  'EG',
  'VN',
  'IR',
  'TR',
  'DE',
  'TH',
  'TZ',
  'GB',
  'FR',
  'ZA',
  'IT',
  'KE',
  'CO',
  'SD',
  'MM',
  'KR',
  'ES',
  'DZ',
  'AR',
  'IQ',
  'UG',
  'AF',
  'CA',
  'UZ',
  'AO',
  'MA',
  'PL',
  'SA',
  'MZ',
  'MY',
  'GH',
  'PE',
  'CI',
  'YE',
  'MG',
  'NP',
] as const satisfies readonly CountryCode[]);

export interface PopularPhoneCountriesParameters {
  metadata?: PhoneMetadata;
}

/**
 * Returns up to `count` of the most populous countries supported by the
 * metadata, most populous first. Pass the result to `preferredCountries`.
 */
export function getPopularPhoneCountries(
  count: number = POPULAR_COUNTRIES.length,
  parameters: PopularPhoneCountriesParameters = {},
): readonly CountryCode[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError('Popular country count must be a non-negative integer.');
  }
  const metadata = parameters.metadata ?? DEFAULT_PHONE_METADATA;
  return Object.freeze(
    POPULAR_COUNTRIES.filter((country) => isSupportedCountry(country, metadata)).slice(
      0,
      count,
    ),
  );
}

function optionSearchRank(
  option: Readonly<PhoneCountryOption>,
  englishQuery: string,
  localizedQuery: string,
  callingCodeQuery: string | null,
): number {
  const metadata = getCountrySearchMetadata(option);
  const exactCallingCode =
    callingCodeQuery !== null && metadata.callingCodeKey === callingCodeQuery;

  if (
    metadata.countryKey === englishQuery ||
    (exactCallingCode && metadata.mainCountryForCallingCode)
  ) {
    return 0;
  }
  if (exactCallingCode) {
    return 1;
  }
  if (
    metadata.localizedNameKey.startsWith(localizedQuery) ||
    metadata.englishNameKey.startsWith(englishQuery) ||
    metadata.countryKey.startsWith(englishQuery) ||
    (callingCodeQuery !== null && metadata.callingCodeKey.startsWith(callingCodeQuery))
  ) {
    return 2;
  }
  if (
    metadata.localizedNameKey.includes(localizedQuery) ||
    metadata.englishNameKey.includes(englishQuery)
  ) {
    return 3;
  }
  return Number.POSITIVE_INFINITY;
}

export function filterPhoneCountryOptions(
  options: readonly PhoneCountryOption[],
  query: string,
  parameters: FilterPhoneCountryOptionsParameters = {},
): readonly PhoneCountryOption[] {
  const limit = parameters.limit;
  if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
    throw new RangeError('Country selector result limit must be a positive integer.');
  }

  const englishQuery = normalizeNameSearchText(query, DEFAULT_INTL_LOCALE);
  const callingCodeQuery = normalizeCallingCodeSearchQuery(query);
  const localizedQueries = new Map<string, string>();
  const matches = englishQuery
    ? options
        .map((option, index) => {
          const locale = getCountrySearchMetadata(option).locale;
          let localizedQuery = localizedQueries.get(locale);
          if (localizedQuery === undefined) {
            localizedQuery = normalizeNameSearchText(query, locale);
            localizedQueries.set(locale, localizedQuery);
          }

          return {
            index,
            option,
            rank: optionSearchRank(
              option,
              englishQuery,
              localizedQuery,
              callingCodeQuery,
            ),
          };
        })
        .filter(({ rank }) => Number.isFinite(rank))
        .sort((left, right) => left.rank - right.rank || left.index - right.index)
        .map(({ option }) => option)
    : [...options];
  const bounded = limit === undefined ? matches : matches.slice(0, limit);

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

/**
 * The country a selector trigger shows. An explicit selection stays visible
 * while its calling code matches the number (digits may still need fixing);
 * a different calling code yields the country the numbering plan resolves,
 * and a non-geographic plan shows no country.
 */
export function resolveDisplayedPhoneCountry(
  selectedCountry: CountryCode | null,
  numberingPlan: NumberingPlanResolution,
  metadata: PhoneMetadata = DEFAULT_PHONE_METADATA,
): CountryCode | null {
  if (numberingPlan.kind === 'non-geographic') {
    return null;
  }
  if (
    selectedCountry &&
    (numberingPlan.countryCallingCode === null ||
      getCountryCallingCode(selectedCountry, metadata) ===
        numberingPlan.countryCallingCode)
  ) {
    return selectedCountry;
  }
  return numberingPlan.resolvedCountry;
}

export function resolvePhoneCountrySelection(
  value: PhoneValue,
  country: CountryCode,
  options: PhoneCountrySelectionOptions = {},
): PhoneCountrySelectionResult {
  const metadata = options.metadata ?? DEFAULT_PHONE_METADATA;
  assertPhoneValue(value);
  assertSupportedCountry(country, 'selected', metadata);

  const callingCode = getCountryCallingCode(country, metadata);
  const currentDigits = value?.slice(1) ?? '';
  const previousNumberingPlan = resolveNumberingPlan(value, { metadata });
  const replacesPartialCallingCode = isPartialInternationalCallingCode(
    currentDigits,
    previousNumberingPlan,
    metadata,
  );
  const nationalDigits = replacesPartialCallingCode
    ? ''
    : previousNumberingPlan.countryCallingCode
      ? currentDigits.slice(previousNumberingPlan.countryCallingCode.length)
      : currentDigits;
  const candidate = `+${callingCode}${nationalDigits}` as Exclude<
    PhoneValue,
    undefined
  >;
  const candidateNumberingPlan = resolveNumberingPlan(candidate, {
    metadata,
    selectedCountry: country,
  });
  const reason: PhoneCountrySelectionAppliedReason = replacesPartialCallingCode
    ? 'partial-calling-code-replaced'
    : nationalDigits.length === 0
      ? 'calling-code-initialized'
      : previousNumberingPlan.countryCallingCode === callingCode
        ? 'calling-code-preserved'
        : 'national-digits-preserved';

  return Object.freeze({
    candidateNumberingPlan,
    candidateValue: candidate,
    country,
    numberingPlan: candidateNumberingPlan,
    previousNumberingPlan,
    previousValue: value,
    reason,
    status: 'applied',
    value: candidate,
  });
}

export function selectPhoneCountryValue(
  value: PhoneValue,
  country: CountryCode,
  options: PhoneCountrySelectionOptions = {},
): PhoneValue {
  return resolvePhoneCountrySelection(value, country, options).value;
}
