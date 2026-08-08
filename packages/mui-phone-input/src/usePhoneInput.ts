'use client';

import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import {
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactNode,
  type RefCallback,
  type RefObject,
  useCallback,
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
import {
  assertPhoneExtension,
  parsePhoneExtension,
  type PhoneExtension,
} from './phone-extension';
import type {
  DisplayMask,
  FormatStrategy,
  PhoneInputDisplayMode,
} from './phone-formatting';
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

export type PhoneExtensionChangeReason = 'clear' | 'input' | 'paste';

export interface PhoneExtensionChangeDetails {
  extension: PhoneExtension;
  previousExtension: PhoneExtension;
  reason: PhoneExtensionChangeReason;
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
  defaultExtension?: PhoneExtension;
  defaultValue?: PhoneValue;
  disabled?: boolean;
  displayMask?: DisplayMask;
  displayMode?: PhoneInputDisplayMode;
  error?: boolean;
  extension?: PhoneExtension;
  extensionError?: boolean;
  extensionMaxLength?: number;
  extensionRequired?: boolean;
  formatStrategy?: FormatStrategy;
  id?: string;
  locale?: string;
  metadata?: PhoneMetadata;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  onCountryChange?: (
    country: CountryCode | null,
    details: PhoneCountryChangeDetails,
  ) => void;
  onCountrySelection?: (result: PhoneCountrySelectionResult) => void;
  onExtensionChange?: (
    extension: PhoneExtension,
    details: PhoneExtensionChangeDetails,
  ) => void;
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
  extension: PhoneExtension;
  extensionControlled: boolean;
  extensionError: boolean;
  extensionInputId: string;
  extensionMaxLength: number | undefined;
  extensionRequired: boolean;
  extensionValidationMessageId: string;
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

export type PhoneExtensionInputExternalProps = Omit<
  ComponentPropsWithoutRef<'input'>,
  | 'defaultValue'
  | 'disabled'
  | 'id'
  | 'maxLength'
  | 'onChange'
  | 'onInput'
  | 'readOnly'
  | 'required'
  | 'value'
> &
  PhoneInputDataAttributes & {
    onInput?: (event: FormEvent<HTMLInputElement>) => void;
  };

export type PhoneInputResolvedExtensionInputProps = PhoneExtensionInputExternalProps & {
  'aria-invalid': boolean;
  'data-phone-extension-controlled': 'false' | 'true';
  disabled: boolean;
  id: string;
  inputMode: 'numeric' | (string & {});
  maxLength?: number | undefined;
  onInput(event: FormEvent<HTMLInputElement>): void;
  readOnly: boolean;
  ref: RefCallback<HTMLInputElement>;
  required: boolean;
  value: string;
};

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
    id: string;
  };

export interface UsePhoneInputReturn {
  actions: PhoneInputActions;
  extensionInputElementRef: RefObject<HTMLInputElement | null>;
  getExtensionInputProps(
    externalProps?: PhoneExtensionInputExternalProps,
  ): PhoneInputResolvedExtensionInputProps;
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
  setExtensionInputRef: RefCallback<HTMLInputElement>;
  setInputRef: RefCallback<HTMLInputElement>;
  state: PhoneInputState;
}

function assertExtensionPolicyValue(
  value: PhoneExtension,
  label: 'defaultExtension' | 'extension',
  maxLength: number | undefined,
): void {
  assertPhoneExtension(value);
  if (maxLength === undefined || value === undefined) {
    return;
  }
  if (parsePhoneExtension(value, { maxLength }) !== value) {
    throw new TypeError(`${label} exceeds extensionMaxLength.`);
  }
}

function usePhoneInputInternal(
  parameters: UsePhoneInputParameters = {},
  diagnosticName: 'MuiPhoneInput' | 'usePhoneInput',
): UsePhoneInputReturn {
  const {
    allowedNumberTypes,
    defaultCountry,
    defaultExtension,
    defaultValue,
    disabled = false,
    displayMask,
    displayMode = 'international',
    error = false,
    extension,
    extensionError = false,
    extensionMaxLength,
    extensionRequired = false,
    formatStrategy,
    id,
    locale = 'en',
    metadata = DEFAULT_PHONE_METADATA,
    onChange,
    onCountryChange,
    onCountrySelection,
    onExtensionChange,
    readOnly = false,
    required = false,
    selectedCountry,
    validationDisplay = 'blur',
    validationMessage,
    validationMode = 'possible',
    value,
  } = parameters;
  const generatedId = useId();
  parsePhoneExtension(undefined, {
    ...(extensionMaxLength === undefined ? {} : { maxLength: extensionMaxLength }),
  });
  if (Object.hasOwn(parameters, 'defaultExtension')) {
    assertExtensionPolicyValue(
      defaultExtension,
      'defaultExtension',
      extensionMaxLength,
    );
  }
  if (Object.hasOwn(parameters, 'extension')) {
    assertExtensionPolicyValue(extension, 'extension', extensionMaxLength);
  }
  const inputId = id ?? `mui-phone-input-${generatedId}`;
  const extensionInputId = `${inputId}-extension`;
  const extensionValidationMessageId = `${inputId}-extension-helper-text`;
  const validationMessageId = `${inputId}-helper-text`;
  const ownership = usePhoneInputOwnership(
    {
      ...(Object.hasOwn(parameters, 'defaultCountry') ? { defaultCountry } : {}),
      ...(Object.hasOwn(parameters, 'defaultExtension') ? { defaultExtension } : {}),
      ...(Object.hasOwn(parameters, 'defaultValue') ? { defaultValue } : {}),
      ...(Object.hasOwn(parameters, 'extension') ? { extension } : {}),
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
    displayMode,
    error,
    locale,
    metadata,
    required,
    validationMode,
    validationVisible,
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(displayMask === undefined ? {} : { displayMask }),
    ...(formatStrategy === undefined ? {} : { formatStrategy }),
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
    handleExtensionInput,
    extensionInputElementRef,
    inputElementRef,
    reset,
    selectCountry,
    setExtensionInputRef,
    setInputRef,
  } = usePhoneInputTransactions({
    inputContext: derivedState.inputContext,
    metadata,
    numberingPlan: derivedState.numberingPlan,
    presentation: derivedState.presentation,
    ownership,
    required,
    resetValidationVisibility,
    validationMode,
    ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    ...(extensionMaxLength === undefined ? {} : { extensionMaxLength }),
    ...(onChange === undefined ? {} : { onChange }),
    ...(onCountryChange === undefined ? {} : { onCountryChange }),
    ...(onCountrySelection === undefined ? {} : { onCountrySelection }),
    ...(onExtensionChange === undefined ? {} : { onExtensionChange }),
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
      displayValue: derivedState.presentation.displayValue,
      empty: ownership.currentValue === undefined,
      error: derivedState.resolvedError,
      extension: ownership.currentExtension,
      extensionControlled: ownership.extensionControlledRef.current,
      extensionError,
      extensionInputId,
      extensionMaxLength,
      extensionRequired,
      extensionValidationMessageId,
      inputId,
      metadata,
      numberingPlan: derivedState.numberingPlan,
      readOnly,
      required,
      selectedCountry: ownership.currentSelectedCountry,
      validation: derivedState.validation,
      validationError: derivedState.validationError,
      validationMessage: derivedState.resolvedValidationMessage,
      validationMessageId,
      validationVisible,
      value: ownership.currentValue,
    }),
    [
      derivedState.numberingPlan,
      derivedState.presentation,
      derivedState.resolvedError,
      derivedState.resolvedValidationMessage,
      derivedState.validation,
      derivedState.validationError,
      disabled,
      extensionError,
      extensionInputId,
      extensionMaxLength,
      extensionRequired,
      extensionValidationMessageId,
      inputId,
      metadata,
      ownership.controlledRef,
      ownership.countryControlledRef,
      ownership.currentExtension,
      ownership.currentSelectedCountry,
      ownership.currentValue,
      ownership.extensionControlledRef,
      readOnly,
      required,
      validationMessageId,
      validationVisible,
    ],
  );
  const { getInputProps, getRootProps, getValidationMessageProps } =
    usePhoneInputPropGetters({
      controlled: ownership.controlledRef.current,
      displayValue: derivedState.presentation.displayValue,
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
  const getExtensionInputProps = useCallback(
    (
      externalProps: PhoneExtensionInputExternalProps = {},
    ): PhoneInputResolvedExtensionInputProps => {
      const { onInput, ...rest } = externalProps;
      return {
        ...rest,
        'aria-invalid': extensionError,
        'data-phone-extension-controlled': ownership.extensionControlledRef.current
          ? 'true'
          : 'false',
        autoComplete: externalProps.autoComplete ?? 'tel-extension',
        disabled,
        id: extensionInputId,
        inputMode: externalProps.inputMode ?? 'numeric',
        ...(extensionMaxLength === undefined ? {} : { maxLength: extensionMaxLength }),
        onInput: (event) => {
          onInput?.(event);
          if (!event.defaultPrevented) {
            handleExtensionInput(event);
          }
        },
        readOnly,
        ref: setExtensionInputRef,
        required: extensionRequired,
        value: ownership.currentExtension ?? '',
      };
    },
    [
      disabled,
      extensionError,
      extensionInputId,
      extensionMaxLength,
      extensionRequired,
      handleExtensionInput,
      ownership.currentExtension,
      ownership.extensionControlledRef,
      readOnly,
      setExtensionInputRef,
    ],
  );

  return useMemo(
    () => ({
      actions,
      extensionInputElementRef,
      getExtensionInputProps,
      getInputProps,
      getRootProps,
      getValidationMessageProps,
      inputElementRef,
      setInputRef,
      setExtensionInputRef,
      state,
    }),
    [
      actions,
      extensionInputElementRef,
      getExtensionInputProps,
      getInputProps,
      getRootProps,
      getValidationMessageProps,
      inputElementRef,
      setInputRef,
      setExtensionInputRef,
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
