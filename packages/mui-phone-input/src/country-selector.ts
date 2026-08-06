import {
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  isPossiblePhoneNumber,
  isSupportedCountry,
} from 'libphonenumber-js/core';

import {
  isPhoneValuePossibleForCountry,
  type NumberingPlanResolution,
  resolveNumberingPlan,
} from './numbering-plan';
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
  limit?: number;
  selectedCountry?: CountryCode | null;
}

interface PhoneCountrySearchMetadata {
  callingCodeKey: string;
  countryKey: string;
  englishNameKey: string;
  locale: string;
  localizedNameKey: string;
}

export type PhoneCountrySelectionAppliedReason =
  | 'calling-code-initialized'
  | 'calling-code-preserved'
  | 'national-digits-preserved'
  | 'partial-calling-code-replaced';

export type PhoneCountrySelectionConflictReason =
  | 'incompatible-draft'
  | 'impossible-target-draft'
  | 'non-geographic-draft';

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

export interface PhoneCountrySelectionConflictResult
  extends PhoneCountrySelectionResultBase {
  reason: PhoneCountrySelectionConflictReason;
  status: 'conflict';
}

export type PhoneCountrySelectionResult =
  | PhoneCountrySelectionAppliedResult
  | PhoneCountrySelectionConflictResult;

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
): Readonly<PhoneCountrySearchMetadata> {
  return Object.freeze({
    callingCodeKey: normalizeCallingCodeSearchQuery(option.callingCode) ?? '',
    countryKey: option.country.toLowerCase(),
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
        createCountrySearchMetadata(option, caseLocale),
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

function optionSearchRank(
  option: Readonly<PhoneCountryOption>,
  englishQuery: string,
  localizedQuery: string,
  callingCodeQuery: string | null,
): number {
  const metadata = getCountrySearchMetadata(option);

  if (
    metadata.countryKey === englishQuery ||
    (callingCodeQuery !== null && metadata.callingCodeKey === callingCodeQuery)
  ) {
    return 0;
  }
  if (
    metadata.localizedNameKey.startsWith(localizedQuery) ||
    metadata.englishNameKey.startsWith(englishQuery) ||
    metadata.countryKey.startsWith(englishQuery) ||
    (callingCodeQuery !== null && metadata.callingCodeKey.startsWith(callingCodeQuery))
  ) {
    return 1;
  }
  if (
    metadata.localizedNameKey.includes(localizedQuery) ||
    metadata.englishNameKey.includes(englishQuery)
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
  const sourceIsPossible =
    value !== undefined && value !== '+' && isPossiblePhoneNumber(value, metadata);
  const conflictReason =
    previousNumberingPlan.kind === 'non-geographic' && nationalDigits.length > 0
      ? 'non-geographic-draft'
      : sourceIsPossible &&
          !isPhoneValuePossibleForCountry(candidate, country, metadata)
        ? 'impossible-target-draft'
        : candidateNumberingPlan.selectedCountry !== country
          ? 'incompatible-draft'
          : null;

  if (conflictReason) {
    return Object.freeze({
      candidateNumberingPlan,
      candidateValue: candidate,
      country,
      numberingPlan: previousNumberingPlan,
      previousNumberingPlan,
      previousValue: value,
      reason: conflictReason,
      status: 'conflict',
      value,
    });
  }

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
