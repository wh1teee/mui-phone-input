import {
  isPossiblePhoneNumber,
  Metadata,
  type MetadataJson,
  parsePhoneNumberFromString as parsePhoneNumberFromStringWithMetadata,
} from 'libphonenumber-js/core';
import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
} from 'libphonenumber-js/max';
import maxMetadata from 'libphonenumber-js/metadata.max.json';

import { canDigitPatternMatchPrefix } from './digit-pattern-prefix';
import { assertPhoneValue, type PhoneValue, parsePhoneValue } from './phone-value';

export interface NumberingPlanResolutionOptions {
  selectedCountry?: CountryCode | null;
}

interface NumberingPlanResolutionBase {
  countryCallingCode: string | null;
  detectedCountry: CountryCode | null;
  possibleCountries: readonly CountryCode[];
  selectedCountry: CountryCode | null;
}

export interface GeographicNumberingPlanResolution extends NumberingPlanResolutionBase {
  kind: 'geographic';
  resolvedCountry: CountryCode;
}

export interface NonGeographicNumberingPlanResolution
  extends NumberingPlanResolutionBase {
  kind: 'non-geographic';
  detectedCountry: null;
  possibleCountries: readonly [];
  resolvedCountry: null;
  selectedCountry: null;
}

export interface UnresolvedNumberingPlanResolution extends NumberingPlanResolutionBase {
  kind: 'unresolved';
  resolvedCountry: null;
}

export type NumberingPlanResolution =
  | GeographicNumberingPlanResolution
  | NonGeographicNumberingPlanResolution
  | UnresolvedNumberingPlanResolution;

const EMPTY_COUNTRIES = Object.freeze([]) as readonly [];
const PHONE_NUMBER_TYPES = [
  'FIXED_LINE',
  'MOBILE',
  'TOLL_FREE',
  'PREMIUM_RATE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
] as const;

const countriesByCallingCode = new Map<string, readonly CountryCode[]>();
const metadataBySelectedCountry = new Map<CountryCode, MetadataJson>();
const validPatternsBySelectedCountry = new Map<CountryCode, readonly string[]>();

for (const country of getCountries()) {
  const callingCode = getCountryCallingCode(country);
  const countries = countriesByCallingCode.get(callingCode) ?? [];
  countriesByCallingCode.set(callingCode, Object.freeze([...countries, country]));
}

function metadataForSelectedCountry(country: CountryCode): MetadataJson {
  const cached = metadataBySelectedCountry.get(country);
  if (cached) {
    return cached;
  }

  const callingCode = getCountryCallingCode(country);
  const countryMetadata = maxMetadata.countries[country];
  if (!countryMetadata) {
    throw new TypeError(`Missing numbering metadata for selected country: ${country}`);
  }

  const metadata: MetadataJson = {
    version: maxMetadata.version,
    country_calling_codes: { [callingCode]: [country] },
    countries: { [country]: countryMetadata },
    nonGeographic: {},
  };
  metadataBySelectedCountry.set(country, metadata);
  return metadata;
}

interface AuthorityNumberType {
  pattern(): string;
}

interface AuthorityNumberingPlan {
  hasTypes(): boolean;
  nationalNumberPattern(): string;
  type(type: (typeof PHONE_NUMBER_TYPES)[number]): AuthorityNumberType | undefined;
}

function validPatternsForSelectedCountry(country: CountryCode): readonly string[] {
  const cached = validPatternsBySelectedCountry.get(country);
  if (cached) {
    return cached;
  }

  const metadata = new Metadata(metadataForSelectedCountry(country));
  metadata.selectNumberingPlan(country);
  const numberingPlan = metadata.numberingPlan as
    | (NonNullable<typeof metadata.numberingPlan> & AuthorityNumberingPlan)
    | undefined;
  if (!numberingPlan) {
    throw new TypeError(`Missing numbering plan for selected country: ${country}`);
  }

  // libphonenumber-js uses region-specific number-type patterns to distinguish
  // countries that share one calling code. The pinned runtime exposes those
  // patterns through Metadata even though the public NumberingPlan type omits them.
  const typePatterns = numberingPlan.hasTypes()
    ? PHONE_NUMBER_TYPES.flatMap((type) => {
        const pattern = numberingPlan.type(type)?.pattern();
        return pattern ? [pattern] : [];
      })
    : [];
  const patterns =
    typePatterns.length > 0 ? typePatterns : [numberingPlan.nationalNumberPattern()];
  for (const pattern of patterns) {
    canDigitPatternMatchPrefix(pattern, '');
  }
  const frozenPatterns = Object.freeze(patterns);
  validPatternsBySelectedCountry.set(country, frozenPatterns);
  return frozenPatterns;
}

function canStillBecomeValidForSelectedCountry(
  value: PhoneValue,
  country: CountryCode,
  countryCallingCode: string,
): boolean {
  if (value === undefined) {
    return true;
  }

  const nationalNumber = value.slice(countryCallingCode.length + 1);
  return validPatternsForSelectedCountry(country).some((pattern) =>
    canDigitPatternMatchPrefix(pattern, nationalNumber),
  );
}

function includeCountry(
  countries: readonly CountryCode[],
  country: CountryCode | null,
): readonly CountryCode[] {
  if (!country || countries.includes(country)) {
    return countries;
  }

  return Object.freeze([...countries, country]);
}

function validateSelectedCountry(
  selectedCountry: CountryCode | null | undefined,
): CountryCode | null {
  if (selectedCountry == null) {
    return null;
  }

  if (!isSupportedCountry(selectedCountry)) {
    throw new TypeError(`Unsupported selected country: ${selectedCountry}`);
  }

  return selectedCountry;
}

/**
 * Parses one complete national number under an explicit country authority.
 * Returns `null` for incomplete, international, malformed, or structurally
 * impossible input.
 */
export function parseNationalPhoneValue(
  input: string,
  country: CountryCode,
): Exclude<PhoneValue, undefined> | null {
  validateSelectedCountry(country);

  if (input.includes('+')) {
    return null;
  }

  let normalized: PhoneValue;
  try {
    normalized = parsePhoneValue(input);
  } catch {
    return null;
  }

  const nationalDigits = normalized?.slice(1);
  if (!nationalDigits) {
    return null;
  }

  const phoneNumber = parsePhoneNumberFromStringWithMetadata(
    nationalDigits,
    country,
    metadataForSelectedCountry(country),
  );
  if (!phoneNumber) {
    return null;
  }

  const candidate = phoneNumber.number as Exclude<PhoneValue, undefined>;
  return isPhoneValuePossibleForCountry(candidate, country) ? candidate : null;
}

export function isPhoneValuePossibleForCountry(
  value: PhoneValue,
  country: CountryCode,
): boolean {
  assertPhoneValue(value);
  validateSelectedCountry(country);
  return (
    value !== undefined &&
    value !== '+' &&
    isPossiblePhoneNumber(value, metadataForSelectedCountry(country))
  );
}

function resolveCompatibleSelection(
  value: PhoneValue,
  selectedCountry: CountryCode | null,
  countryCallingCode: string | null,
): CountryCode | null {
  if (!selectedCountry) {
    return null;
  }

  const selectedCallingCode = getCountryCallingCode(selectedCountry);

  if (countryCallingCode) {
    if (selectedCallingCode !== countryCallingCode) {
      return null;
    }

    return canStillBecomeValidForSelectedCountry(
      value,
      selectedCountry,
      selectedCallingCode,
    )
      ? selectedCountry
      : null;
  }

  const inputDigits = value?.slice(1) ?? '';
  return inputDigits.length === 0 || selectedCallingCode.startsWith(inputDigits)
    ? selectedCountry
    : null;
}

export function resolveNumberingPlan(
  value: PhoneValue,
  options: NumberingPlanResolutionOptions = {},
): NumberingPlanResolution {
  assertPhoneValue(value);

  const requestedSelection = validateSelectedCountry(options.selectedCountry);
  const formatter = new AsYouType();

  if (value) {
    formatter.input(value);
  }

  const detectedCountry = formatter.getCountry() ?? null;
  const detectedCallingCode = formatter.getCallingCode() ?? null;
  const countriesForCallingCode = detectedCallingCode
    ? (countriesByCallingCode.get(detectedCallingCode) ?? EMPTY_COUNTRIES)
    : EMPTY_COUNTRIES;
  const authorityPossibleCountries =
    formatter.getNumber()?.getPossibleCountries() ?? [];
  const narrowedPossibleCountries =
    authorityPossibleCountries.length > 0
      ? Object.freeze([...authorityPossibleCountries])
      : EMPTY_COUNTRIES;
  const isNonGeographic =
    detectedCallingCode !== null && countriesForCallingCode.length === 0;

  if (isNonGeographic) {
    return {
      countryCallingCode: detectedCallingCode,
      detectedCountry: null,
      kind: 'non-geographic',
      possibleCountries: EMPTY_COUNTRIES,
      resolvedCountry: null,
      selectedCountry: null,
    };
  }

  const selectedCountry = resolveCompatibleSelection(
    value,
    requestedSelection,
    detectedCallingCode,
  );
  const selectedCallingCode = selectedCountry
    ? getCountryCallingCode(selectedCountry)
    : null;
  const countryCallingCode = detectedCallingCode ?? selectedCallingCode;
  const authorityCountries = countryCallingCode
    ? narrowedPossibleCountries.length > 0
      ? narrowedPossibleCountries
      : (countriesByCallingCode.get(countryCallingCode) ?? EMPTY_COUNTRIES)
    : EMPTY_COUNTRIES;
  const possibleCountries = includeCountry(authorityCountries, selectedCountry);
  const resolvedCountry =
    selectedCountry ??
    detectedCountry ??
    (possibleCountries.length === 1 ? possibleCountries[0] : null);

  if (resolvedCountry) {
    return {
      countryCallingCode,
      detectedCountry,
      kind: 'geographic',
      possibleCountries,
      resolvedCountry,
      selectedCountry,
    };
  }

  return {
    countryCallingCode,
    detectedCountry,
    kind: 'unresolved',
    possibleCountries,
    resolvedCountry: null,
    selectedCountry,
  };
}
