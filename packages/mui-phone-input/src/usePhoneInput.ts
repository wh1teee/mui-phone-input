'use client';

import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import {
  type ComponentPropsWithoutRef,
  type ReactNode,
  type RefCallback,
  type RefObject,
  useId,
  useMemo,
} from 'react';

import type { PhoneCountrySelectionResult } from './country-selector';
import { usePhoneInputDerivedState } from './internal/phone-input-derived-state';
import { usePhoneInputOwnership } from './internal/use-phone-input-ownership';
import { usePhoneInputPropGetters } from './internal/use-phone-input-prop-getters';
import { usePhoneInputTransactions } from './internal/use-phone-input-transactions';
import { usePhoneInputValidationVisibility } from './internal/use-phone-input-validation-visibility';
import type { NumberingPlanResolution } from './numbering-plan';
import type { PhoneValidationMode, PhoneValidationResult } from './phone-validation';
import { DEFAULT_PHONE_METADATA, type PhoneMetadata } from './phone-metadata';
import type { PhoneValue } from './phone-value';

export type PhoneInputChangeReason =
  | 'input'
  | 'delete'
  | 'clear'
  | 'paste'
  | 'replacement'
  | 'composition'
  | 'country-selection'
  | 'history-undo'
  | 'history-redo';

export type PhoneInputValidationState = PhoneValidationResult;

export type PhoneValidationDisplay = 'always' | 'blur' | 'never';

export type PhoneInputNumberingPlanState = NumberingPlanResolution;

export interface PhoneInputChangeDetails {
  numberingPlan: PhoneInputNumberingPlanState;
  previousValue: PhoneValue;
  reason: PhoneInputChangeReason;
  validation: PhoneInputValidationState;
  value: PhoneValue;
}

export type PhoneCountryChangeReason =
  | 'default'
  | 'external-value'
  | 'input'
  | 'paste'
  | 'reset'
  | 'user';

export interface PhoneCountryChangeDetails {
  country: CountryCode | null;
  numberingPlan: PhoneInputNumberingPlanState;
  previousCountry: CountryCode | null;
  previousNumberingPlan: PhoneInputNumberingPlanState;
  previousValue: PhoneValue;
  reason: PhoneCountryChangeReason;
  value: PhoneValue;
}

export interface UsePhoneInputParameters {
  allowedNumberTypes?: readonly PhoneNumberType[];
  defaultCountry?: CountryCode | null;
  defaultValue?: PhoneValue;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  metadata?: PhoneMetadata;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  onCountryChange?: (
    country: CountryCode | null,
    details: PhoneCountryChangeDetails,
  ) => void;
  onCountrySelection?: (result: PhoneCountrySelectionResult) => void;
  readOnly?: boolean;
  required?: boolean;
  selectedCountry?: CountryCode | null;
  validationDisplay?: PhoneValidationDisplay;
  validationMessage?:
    | ReactNode
    | ((validation: PhoneInputValidationState) => ReactNode);
  validationMode?: PhoneValidationMode;
  value?: PhoneValue;
}

export interface PhoneInputState {
  controlled: boolean;
  countryControlled: boolean;
  disabled: boolean;
  displayValue: string;
  empty: boolean;
  error: boolean;
  inputId: string;
  metadata: PhoneMetadata;
  numberingPlan: PhoneInputNumberingPlanState;
  readOnly: boolean;
  required: boolean;
  selectedCountry: CountryCode | null;
  validation: PhoneInputValidationState;
  validationError: boolean;
  validationMessage: ReactNode;
  validationMessageId: string;
  validationVisible: boolean;
  value: PhoneValue;
}

export interface PhoneInputActions {
  clear(): void;
  focus(): void;
  reset(): void;
  selectCountry(country: CountryCode): PhoneCountrySelectionResult;
}

export type PhoneInputDataAttributes = {
  [key: `data-${string}`]: boolean | number | string | undefined;
};

export type PhoneInputInputExternalProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  'defaultValue' | 'disabled' | 'id' | 'onChange' | 'readOnly' | 'required' | 'value'
> &
  PhoneInputDataAttributes;

export type PhoneInputResolvedInputProps = PhoneInputInputExternalProps & {
  'aria-describedby'?: string | undefined;
  'aria-errormessage'?: string | undefined;
  'aria-invalid': boolean;
  'data-phone-input-accepted': 'false' | 'true';
  'data-phone-input-country': CountryCode | '';
  'data-phone-input-plan': PhoneInputNumberingPlanState['kind'];
  'data-phone-input-status': PhoneInputValidationState['status'];
  disabled: boolean;
  id: string;
  readOnly: boolean;
  ref: RefCallback<HTMLInputElement>;
  required: boolean;
  value: string;
};

export type PhoneInputRootExternalProps = ComponentPropsWithoutRef<'div'> &
  PhoneInputDataAttributes;

export type PhoneInputResolvedRootProps = PhoneInputRootExternalProps & {
  'data-phone-input-accepted': 'false' | 'true';
  'data-phone-input-country': CountryCode | '';
  'data-phone-input-controlled': 'false' | 'true';
  'data-phone-input-plan': PhoneInputNumberingPlanState['kind'];
  'data-phone-input-status': PhoneInputValidationState['status'];
};

export type PhoneInputValidationMessageExternalProps =
  ComponentPropsWithoutRef<'span'> & PhoneInputDataAttributes;

export type PhoneInputResolvedValidationMessageProps =
  PhoneInputValidationMessageExternalProps & {
    'aria-live': 'polite';
    id: string;
  };

export interface UsePhoneInputReturn {
  actions: PhoneInputActions;
  getInputProps(
    externalProps?: PhoneInputInputExternalProps,
  ): PhoneInputResolvedInputProps;
  getRootProps(
    externalProps?: PhoneInputRootExternalProps,
  ): PhoneInputResolvedRootProps;
  getValidationMessageProps(
    externalProps?: PhoneInputValidationMessageExternalProps,
  ): PhoneInputResolvedValidationMessageProps;
  inputElementRef: RefObject<HTMLInputElement | null>;
  setInputRef: RefCallback<HTMLInputElement>;
  state: PhoneInputState;
}

function usePhoneInputInternal(
  parameters: UsePhoneInputParameters = {},
  diagnosticName: 'MuiPhoneInput' | 'usePhoneInput',
): UsePhoneInputReturn {
  const {
    allowedNumberTypes,
    defaultCountry,
    defaultValue,
    disabled = false,
    error = false,
    id,
    metadata = DEFAULT_PHONE_METADATA,
    onChange,
    onCountryChange,
    onCountrySelection,
    readOnly = false,
    required = false,
    selectedCountry,
    validationDisplay = 'blur',
    validationMessage,
    validationMode = 'possible',
    value,
  } = parameters;
  const generatedId = useId();
  const inputId = id ?? `mui-phone-input-${generatedId}`;
  const validationMessageId = `${inputId}-helper-text`;
  const ownership = usePhoneInputOwnership(
    {
      ...(Object.hasOwn(parameters, 'defaultCountry') ? { defaultCountry } : {}),
      ...(Object.hasOwn(parameters, 'defaultValue') ? { defaultValue } : {}),
      ...(Object.hasOwn(parameters, 'selectedCountry') ? { selectedCountry } : {}),
      ...(Object.hasOwn(parameters, 'value') ? { value } : {}),
    },
    diagnosticName,
    metadata,
  );
  const { handleBlur, resetValidationVisibility, validationVisible } =
    usePhoneInputValidationVisibility(validationDisplay);
  const derivedState = usePhoneInputDerivedState({
    currentSelectedCountry: ownership.currentSelectedCountry,
    currentValue: ownership.currentValue,
    error,
    metadata,
    required,
    validationMode,
    validationVisible,
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(validationMessage === undefined ? {} : { validationMessage }),
  });
  const {
    clear,
    focus,
    handleCompositionEnd,
    handleCompositionStart,
    handleInput,
    handleInputCapture,
    handlePaste,
    inputElementRef,
    reset,
    selectCountry,
    setInputRef,
  } = usePhoneInputTransactions({
    inputContext: derivedState.inputContext,
    metadata,
    numberingPlan: derivedState.numberingPlan,
    ownership,
    required,
    resetValidationVisibility,
    validationMode,
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(onChange === undefined ? {} : { onChange }),
    ...(onCountryChange === undefined ? {} : { onCountryChange }),
    ...(onCountrySelection === undefined ? {} : { onCountrySelection }),
  });
  const actions = useMemo<PhoneInputActions>(
    () => ({
      clear,
      focus,
      reset,
      selectCountry,
    }),
    [clear, focus, reset, selectCountry],
  );
  const state = useMemo<PhoneInputState>(
    () => ({
      controlled: ownership.controlledRef.current,
      countryControlled: ownership.countryControlledRef.current,
      disabled,
      displayValue: ownership.currentValue ?? '',
      empty: ownership.currentValue === undefined,
      error: derivedState.resolvedError,
      inputId,
      metadata,
      numberingPlan: derivedState.numberingPlan,
      readOnly,
      required,
      selectedCountry: derivedState.numberingPlan.selectedCountry,
      validation: derivedState.validation,
      validationError: derivedState.validationError,
      validationMessage: derivedState.resolvedValidationMessage,
      validationMessageId,
      validationVisible,
      value: ownership.currentValue,
    }),
    [
      derivedState.numberingPlan,
      derivedState.resolvedError,
      derivedState.resolvedValidationMessage,
      derivedState.validation,
      derivedState.validationError,
      disabled,
      inputId,
      metadata,
      ownership.controlledRef,
      ownership.countryControlledRef,
      ownership.currentValue,
      readOnly,
      required,
      validationMessageId,
      validationVisible,
    ],
  );
  const { getInputProps, getRootProps, getValidationMessageProps } =
    usePhoneInputPropGetters({
      controlled: ownership.controlledRef.current,
      currentValue: ownership.currentValue,
      disabled,
      error: state.error,
      handleBlur,
      handleCompositionEnd,
      handleCompositionStart,
      handleInput,
      handleInputCapture,
      handlePaste,
      inputId,
      numberingPlan: derivedState.numberingPlan,
      readOnly,
      required,
      setInputRef,
      validation: derivedState.validation,
      validationError: derivedState.validationError,
      validationMessageId,
    });

  return useMemo(
    () => ({
      actions,
      getInputProps,
      getRootProps,
      getValidationMessageProps,
      inputElementRef,
      setInputRef,
      state,
    }),
    [
      actions,
      getInputProps,
      getRootProps,
      getValidationMessageProps,
      inputElementRef,
      setInputRef,
      state,
    ],
  );
}

export function usePhoneInput(
  parameters: UsePhoneInputParameters = {},
): UsePhoneInputReturn {
  return usePhoneInputInternal(parameters, 'usePhoneInput');
}

export function useMuiPhoneInput(
  parameters: UsePhoneInputParameters = {},
): UsePhoneInputReturn {
  return usePhoneInputInternal(parameters, 'MuiPhoneInput');
}
