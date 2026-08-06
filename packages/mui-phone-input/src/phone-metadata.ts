import {
  getCountries,
  getCountryCallingCode,
  Metadata,
  type MetadataJson,
} from 'libphonenumber-js/core';
import maxMetadata from 'libphonenumber-js/metadata.max.json';

declare const phoneMetadataBrand: unique symbol;

export type PhoneMetadata = MetadataJson & {
  readonly [phoneMetadataBrand]: true;
};

const validatedMetadata = new WeakSet<object>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validatePhoneMetadata(metadata: unknown): PhoneMetadata {
  if (!isRecord(metadata)) {
    throw new TypeError('Phone metadata must be a libphonenumber-js metadata object.');
  }

  if (validatedMetadata.has(metadata)) {
    return metadata as PhoneMetadata;
  }

  if (
    metadata.version !== 4 ||
    !isRecord(metadata.country_calling_codes) ||
    !isRecord(metadata.countries) ||
    !isRecord(metadata.nonGeographic)
  ) {
    throw new TypeError(
      'Phone metadata must use the current libphonenumber-js metadata v4 schema.',
    );
  }

  const candidate = metadata as MetadataJson;
  let countries: ReturnType<typeof getCountries>;
  try {
    countries = getCountries(candidate);
    new Metadata(candidate);
  } catch (error) {
    throw new TypeError('Phone metadata is not readable by libphonenumber-js.', {
      cause: error,
    });
  }

  for (const country of countries) {
    let callingCode: string;
    try {
      callingCode = getCountryCallingCode(country, candidate);
    } catch (error) {
      throw new TypeError(`Phone metadata is invalid for country ${country}.`, {
        cause: error,
      });
    }

    const countriesForCallingCode = candidate.country_calling_codes[callingCode];
    if (!countriesForCallingCode?.includes(country)) {
      throw new TypeError(
        `Phone metadata calling-code index does not include ${country} under +${callingCode}.`,
      );
    }
  }

  for (const [callingCode, indexedCountries] of Object.entries(
    candidate.country_calling_codes,
  )) {
    if (!Array.isArray(indexedCountries) || indexedCountries.length === 0) {
      throw new TypeError(`Phone metadata has an empty +${callingCode} country index.`);
    }
    for (const country of indexedCountries) {
      if (!(country in candidate.countries)) {
        throw new TypeError(
          `Phone metadata references missing country ${country} under +${callingCode}.`,
        );
      }
    }
  }

  validatedMetadata.add(candidate);
  return candidate as PhoneMetadata;
}

export const DEFAULT_PHONE_METADATA: PhoneMetadata = validatePhoneMetadata(maxMetadata);
