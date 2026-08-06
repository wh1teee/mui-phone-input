'use client';

import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import { type ReactNode, useMemo } from 'react';

import type {
  PhoneInputNumberingPlanState,
  PhoneInputValidationState,
} from '../usePhoneInput';
import { type NumberingPlanResolution, resolveNumberingPlan } from '../numbering-plan';
import {
  type PhoneValidationMode,
  type PhoneValidationOptions,
  validatePhoneValue,
} from '../phone-validation';
import type { PhoneMetadata } from '../phone-metadata';
import type { PhoneValue } from '../phone-value';
import type { InputEngineContext } from './input-transaction-engine';

const E164_INPUT_CONTEXT: InputEngineContext = {
  fixedCallingCode: false,
  formatStrategyKey: 'e164',
  locale: 'en',
};

interface PhoneInputDerivedStateParameters {
  allowedNumberTypes?: readonly PhoneNumberType[];
  currentSelectedCountry: CountryCode | null;
  currentValue: PhoneValue;
  error: boolean;
  metadata: PhoneMetadata;
  required: boolean;
  validationMessage?:
    | ReactNode
    | ((validation: PhoneInputValidationState) => ReactNode);
  validationMode: PhoneValidationMode;
  validationVisible: boolean;
}

export interface PhoneInputDerivedState {
  inputContext: InputEngineContext;
  numberingPlan: NumberingPlanResolution;
  resolvedError: boolean;
  resolvedValidationMessage: ReactNode;
  validation: PhoneInputValidationState;
  validationError: boolean;
}

function defaultValidationMessage(validation: PhoneInputValidationState): ReactNode {
  switch (validation.reason) {
    case 'required':
      return 'Enter a phone number.';
    case 'no-digits':
    case 'too-short':
      return 'Complete the phone number.';
    case 'strict-validity-required':
      return 'Enter a valid phone number.';
    case 'unknown-number-type':
    case 'disallowed-number-type':
      return 'This phone number type is not accepted.';
    case 'custom-rejected':
      return 'This phone number is not accepted.';
    default:
      return 'Enter a structurally valid phone number.';
  }
}

function resolveValidationMessage(
  validationMessage:
    | ReactNode
    | ((validation: PhoneInputValidationState) => ReactNode)
    | undefined,
  validation: PhoneInputValidationState,
): ReactNode {
  return typeof validationMessage === 'function'
    ? validationMessage(validation)
    : (validationMessage ?? defaultValidationMessage(validation));
}

export function usePhoneInputDerivedState(
  parameters: PhoneInputDerivedStateParameters,
): PhoneInputDerivedState {
  const {
    allowedNumberTypes,
    currentSelectedCountry,
    currentValue,
    error,
    metadata,
    required,
    validationMessage,
    validationMode,
    validationVisible,
  } = parameters;
  const numberingPlanOptions = useMemo(
    () =>
      currentSelectedCountry == null
        ? { metadata }
        : { metadata, selectedCountry: currentSelectedCountry },
    [currentSelectedCountry, metadata],
  );
  const validationOptions = useMemo<PhoneValidationOptions>(
    () => ({
      metadata,
      required,
      validationMode,
      ...(currentSelectedCountry == null
        ? {}
        : { selectedCountry: currentSelectedCountry }),
      ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    }),
    [allowedNumberTypes, currentSelectedCountry, metadata, required, validationMode],
  );
  const numberingPlan = useMemo<PhoneInputNumberingPlanState>(
    () => resolveNumberingPlan(currentValue, numberingPlanOptions),
    [currentValue, numberingPlanOptions],
  );
  const validation = useMemo(
    () => validatePhoneValue(currentValue, validationOptions),
    [currentValue, validationOptions],
  );
  const validationError = validationVisible && !validation.accepted;
  const resolvedError = error || validationError;
  const resolvedValidationMessage = validationError
    ? resolveValidationMessage(validationMessage, validation)
    : null;
  const inputContext = useMemo<InputEngineContext>(
    () => ({
      ...E164_INPUT_CONTEXT,
      ...(numberingPlan.resolvedCountry
        ? { country: numberingPlan.resolvedCountry }
        : {}),
    }),
    [numberingPlan.resolvedCountry],
  );

  return {
    inputContext,
    numberingPlan,
    resolvedError,
    resolvedValidationMessage,
    validation,
    validationError,
  };
}
