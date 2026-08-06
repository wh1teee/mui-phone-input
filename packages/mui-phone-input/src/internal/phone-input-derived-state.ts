'use client';

import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import { type ReactNode, useMemo } from 'react';

import type {
  PhoneInputNumberingPlanState,
  PhoneInputValidationState,
} from '../usePhoneInput';
import {
  type DisplayMask,
  type FormatStrategy,
  formatPhoneInputPresentation,
  type PhoneInputDisplayMode,
  type PhoneInputPresentation,
} from '../phone-formatting';
import { type NumberingPlanResolution, resolveNumberingPlan } from '../numbering-plan';
import {
  type PhoneValidationMode,
  type PhoneValidationOptions,
  validatePhoneValue,
} from '../phone-validation';
import type { PhoneMetadata } from '../phone-metadata';
import type { PhoneValue } from '../phone-value';
import type { InputEngineContext } from './input-transaction-engine';

const DEFAULT_INPUT_CONTEXT: InputEngineContext = {
  displayMode: 'international',
  fixedCallingCode: false,
  formatStrategyKey: 'automatic',
  locale: 'en',
};

interface PhoneInputDerivedStateParameters {
  allowedNumberTypes?: readonly PhoneNumberType[];
  currentSelectedCountry: CountryCode | null;
  currentValue: PhoneValue;
  displayMask?: DisplayMask;
  displayMode: PhoneInputDisplayMode;
  error: boolean;
  formatStrategy?: FormatStrategy;
  locale: string;
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
  presentation: PhoneInputPresentation;
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
    displayMask,
    displayMode,
    error,
    formatStrategy,
    locale,
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
  const formatCountry = currentSelectedCountry ?? numberingPlan.resolvedCountry;
  const presentation = useMemo(
    () =>
      formatPhoneInputPresentation(currentValue, {
        country: formatCountry,
        displayMode,
        locale,
        metadata,
        ...(displayMask === undefined ? {} : { displayMask }),
        ...(formatStrategy === undefined ? {} : { formatStrategy }),
      }),
    [
      currentValue,
      displayMask,
      displayMode,
      formatCountry,
      formatStrategy,
      locale,
      metadata,
    ],
  );
  const inputContext = useMemo<InputEngineContext>(
    () => ({
      ...DEFAULT_INPUT_CONTEXT,
      displayMode,
      fixedCallingCode: displayMode === 'international-fixed-calling-code',
      formatStrategyKey: formatStrategy
        ? 'custom'
        : displayMask
          ? `mask:${displayMask.pattern}`
          : 'automatic',
      locale,
      ...(formatCountry ? { country: formatCountry } : {}),
      ...(displayMask === undefined ? {} : { displayMask }),
      ...(formatStrategy === undefined ? {} : { formatStrategy }),
    }),
    [displayMask, displayMode, formatCountry, formatStrategy, locale],
  );

  return {
    inputContext,
    numberingPlan,
    presentation,
    resolvedError,
    resolvedValidationMessage,
    validation,
    validationError,
  };
}
