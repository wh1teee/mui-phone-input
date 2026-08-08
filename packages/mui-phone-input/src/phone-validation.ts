import {
  type CountryCode,
  formatIncompletePhoneNumber,
  getCountryCallingCode,
  type PhoneNumberType,
  parsePhoneNumberFromString,
  type ValidatePhoneNumberLengthResult,
  validatePhoneNumberLength,
} from 'libphonenumber-js/core';

import {
  metadataForSelectedCountry,
  type NumberingPlanResolution,
  resolveNumberingPlan,
} from './numbering-plan';
import { DEFAULT_PHONE_METADATA, type PhoneMetadata } from './phone-metadata';
import { assertPhoneValue, type PhoneValue } from './phone-value';

export type PhoneValidationStatus =
  | 'empty'
  | 'incomplete'
  | 'possible'
  | 'valid'
  | 'invalid';

export type BuiltInPhoneValidationMode = 'possible' | 'valid' | 'possible-and-type';

export type PhoneValidationReason =
  | 'empty'
  | 'required'
  | 'no-digits'
  | 'not-a-number'
  | 'invalid-country-calling-code'
  | 'too-short'
  | 'too-long'
  | 'invalid-length'
  | 'invalid-pattern'
  | 'possible'
  | 'valid'
  | 'strict-validity-required'
  | 'unknown-number-type'
  | 'disallowed-number-type'
  | 'custom-accepted'
  | 'custom-rejected';

export interface PhoneValidationStrategyContext {
  isPossible: boolean | null;
  isValid: boolean | null;
  numberType: PhoneNumberType | null;
  numberingPlan: Readonly<NumberingPlanResolution>;
  status: PhoneValidationStatus;
  value: PhoneValue;
}

export type PhoneValidationStrategy = (
  context: Readonly<PhoneValidationStrategyContext>,
) => boolean;

export type PhoneValidationMode = BuiltInPhoneValidationMode | PhoneValidationStrategy;

export interface PhoneValidationOptions {
  allowedNumberTypes?: readonly PhoneNumberType[];
  metadata?: PhoneMetadata;
  required?: boolean;
  selectedCountry?: CountryCode | null;
  validationMode?: PhoneValidationMode;
}

export interface PhoneValidationResult {
  accepted: boolean;
  isPossible: boolean | null;
  isValid: boolean | null;
  mode: BuiltInPhoneValidationMode | 'custom';
  numberType: PhoneNumberType | null;
  reason: PhoneValidationReason;
  status: PhoneValidationStatus;
  value: PhoneValue;
}

type StructuralValidation = Readonly<{
  isPossible: boolean | null;
  isValid: boolean | null;
  numberType: PhoneNumberType | null;
  reason: PhoneValidationReason;
  status: PhoneValidationStatus;
}>;

const PHONE_NUMBER_TYPES = new Set<PhoneNumberType>([
  'PREMIUM_RATE',
  'TOLL_FREE',
  'SHARED_COST',
  'VOIP',
  'PERSONAL_NUMBER',
  'PAGER',
  'UAN',
  'VOICEMAIL',
  'FIXED_LINE_OR_MOBILE',
  'FIXED_LINE',
  'MOBILE',
]);

function validatePolicyConfiguration(
  validationMode: PhoneValidationMode,
  allowedNumberTypes: readonly PhoneNumberType[] | undefined,
): void {
  if (validationMode === 'possible-and-type') {
    if (!allowedNumberTypes || allowedNumberTypes.length === 0) {
      throw new TypeError(
        'possible-and-type validation requires at least one allowed number type.',
      );
    }
  } else if (allowedNumberTypes !== undefined) {
    throw new TypeError(
      'allowedNumberTypes can only be used with possible-and-type validation.',
    );
  }

  for (const numberType of allowedNumberTypes ?? []) {
    if (!PHONE_NUMBER_TYPES.has(numberType)) {
      throw new TypeError(`Unsupported phone number type: ${numberType}`);
    }
  }
}

function validationReasonFromLength(
  lengthResult: ValidatePhoneNumberLengthResult,
): Pick<StructuralValidation, 'reason' | 'status'> {
  switch (lengthResult) {
    case 'NOT_A_NUMBER':
      return { reason: 'not-a-number', status: 'invalid' };
    case 'INVALID_COUNTRY':
      return { reason: 'invalid-country-calling-code', status: 'invalid' };
    case 'TOO_SHORT':
      return { reason: 'too-short', status: 'incomplete' };
    case 'TOO_LONG':
      return { reason: 'too-long', status: 'invalid' };
    case 'INVALID_LENGTH':
      return { reason: 'invalid-length', status: 'invalid' };
  }
}

function inspectStructure(
  value: PhoneValue,
  metadata: PhoneMetadata,
  selectedCountry: CountryCode | null,
): StructuralValidation {
  const structuralMetadata =
    selectedCountry === null
      ? metadata
      : metadataForSelectedCountry(selectedCountry, metadata);

  if (value === undefined) {
    return {
      isPossible: null,
      isValid: null,
      numberType: null,
      reason: 'empty',
      status: 'empty',
    };
  }

  if (value === '+') {
    return {
      isPossible: null,
      isValid: null,
      numberType: null,
      reason: 'no-digits',
      status: 'incomplete',
    };
  }

  const phoneNumber = parsePhoneNumberFromString(value, structuralMetadata);
  const isPossible = phoneNumber?.isPossible() ?? null;
  const isValid = phoneNumber?.isValid() ?? null;
  const numberType = phoneNumber?.getType() ?? null;
  const lengthResult = validatePhoneNumberLength(value, structuralMetadata);

  if (lengthResult) {
    const { reason, status } = validationReasonFromLength(lengthResult);
    return { isPossible, isValid, numberType, reason, status };
  }

  if (!phoneNumber) {
    return {
      isPossible: null,
      isValid: null,
      numberType: null,
      reason: 'not-a-number',
      status: 'invalid',
    };
  }

  if (!isPossible) {
    return {
      isPossible,
      isValid,
      numberType,
      reason: 'invalid-pattern',
      status: 'invalid',
    };
  }

  return {
    isPossible,
    isValid,
    numberType,
    reason: isValid ? 'valid' : 'possible',
    status: isValid ? 'valid' : 'possible',
  };
}

function resolveStructuralValidationCountry(
  value: PhoneValue,
  selectedCountry: CountryCode | null,
  metadata: PhoneMetadata,
): CountryCode | null {
  if (selectedCountry === null) {
    return null;
  }

  const selectedCallingCode = getCountryCallingCode(selectedCountry, metadata);
  const valueCallingCode = resolveNumberingPlan(value, { metadata }).countryCallingCode;

  return valueCallingCode === null || valueCallingCode === selectedCallingCode
    ? selectedCountry
    : null;
}

export function validatePhoneValue(
  value: PhoneValue,
  options: PhoneValidationOptions = {},
): PhoneValidationResult {
  assertPhoneValue(value);

  const metadata = options.metadata ?? DEFAULT_PHONE_METADATA;
  const validationMode = options.validationMode ?? 'possible';
  validatePolicyConfiguration(validationMode, options.allowedNumberTypes);
  const selectedCountry = options.selectedCountry ?? null;
  const structuralValidationCountry = resolveStructuralValidationCountry(
    value,
    selectedCountry,
    metadata,
  );

  const structure = inspectStructure(value, metadata, structuralValidationCountry);
  const mode = typeof validationMode === 'function' ? 'custom' : validationMode;

  if (structure.status === 'empty') {
    const accepted = options.required !== true;
    return {
      accepted,
      ...structure,
      mode,
      reason: accepted ? 'empty' : 'required',
      value,
    };
  }

  if (structure.status === 'incomplete' || structure.status === 'invalid') {
    return {
      accepted: false,
      ...structure,
      mode,
      value,
    };
  }

  if (typeof validationMode === 'function') {
    const numberingPlanOptions =
      options.selectedCountry == null
        ? { metadata }
        : { metadata, selectedCountry: options.selectedCountry };
    const strategyResult = validationMode(
      Object.freeze({
        isPossible: structure.isPossible,
        isValid: structure.isValid,
        numberType: structure.numberType,
        numberingPlan: Object.freeze(resolveNumberingPlan(value, numberingPlanOptions)),
        status: structure.status,
        value,
      }),
    );

    if (typeof strategyResult !== 'boolean') {
      throw new TypeError('A custom phone validation strategy must return a boolean.');
    }

    return {
      accepted: strategyResult,
      ...structure,
      mode,
      reason: strategyResult ? 'custom-accepted' : 'custom-rejected',
      value,
    };
  }

  if (validationMode === 'valid' && structure.status !== 'valid') {
    return {
      accepted: false,
      ...structure,
      mode,
      reason: 'strict-validity-required',
      value,
    };
  }

  if (validationMode === 'possible-and-type') {
    if (structure.numberType === null) {
      return {
        accepted: false,
        ...structure,
        mode,
        reason: 'unknown-number-type',
        value,
      };
    }

    if (!options.allowedNumberTypes?.includes(structure.numberType)) {
      return {
        accepted: false,
        ...structure,
        mode,
        reason: 'disallowed-number-type',
        value,
      };
    }
  }

  return {
    accepted: true,
    ...structure,
    mode,
    value,
  };
}

export function formatPhoneValueForDisplay(
  value: PhoneValue,
  metadata: PhoneMetadata = DEFAULT_PHONE_METADATA,
): string {
  assertPhoneValue(value);
  return value === undefined ? '' : formatIncompletePhoneNumber(value, metadata);
}
