import { isValidPhoneNumber, type MetadataJson } from 'libphonenumber-js/core';
import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
} from 'libphonenumber-js/max';
import maxMetadata from 'libphonenumber-js/metadata.max.json';

import { assertPhoneValue, type PhoneValue } from './phone-value';

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

const countriesByCallingCode = new Map<string, readonly CountryCode[]>();
const metadataBySelectedCountry = new Map<CountryCode, MetadataJson>();

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

function isValidForSelectedCountry(value: PhoneValue, country: CountryCode): boolean {
  return (
    value !== undefined &&
    isValidPhoneNumber(value, metadataForSelectedCountry(country))
  );
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

function resolveCompatibleSelection(
  value: PhoneValue,
  selectedCountry: CountryCode | null,
  detectedCountry: CountryCode | null,
  countryCallingCode: string | null,
  narrowedPossibleCountries: readonly CountryCode[],
): CountryCode | null {
  if (!selectedCountry) {
    return null;
  }

  const selectedCallingCode = getCountryCallingCode(selectedCountry);

  if (countryCallingCode) {
    if (selectedCallingCode !== countryCallingCode) {
      return null;
    }

    const selectedCountryIsValid = isValidForSelectedCountry(value, selectedCountry);

    if (
      detectedCountry &&
      detectedCountry !== selectedCountry &&
      !selectedCountryIsValid
    ) {
      return null;
    }

    if (
      narrowedPossibleCountries.length > 0 &&
      !narrowedPossibleCountries.includes(selectedCountry) &&
      !selectedCountryIsValid
    ) {
      return null;
    }

    return selectedCountry;
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
    detectedCountry,
    detectedCallingCode,
    narrowedPossibleCountries,
  );
  const selectedCallingCode = selectedCountry
    ? getCountryCallingCode(selectedCountry)
    : null;
  const countryCallingCode = detectedCallingCode ?? selectedCallingCode;
  const possibleCountries = countryCallingCode
    ? narrowedPossibleCountries.length > 0
      ? narrowedPossibleCountries
      : (countriesByCallingCode.get(countryCallingCode) ?? EMPTY_COUNTRIES)
    : EMPTY_COUNTRIES;
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
