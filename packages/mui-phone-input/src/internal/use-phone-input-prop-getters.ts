'use client';

import {
  type ClipboardEvent,
  type CompositionEvent,
  type FocusEvent,
  type FormEvent,
  type RefCallback,
  useCallback,
} from 'react';

import type { PhoneValue } from '../phone-value';
import type {
  PhoneInputInputExternalProps,
  PhoneInputNumberingPlanState,
  PhoneInputResolvedInputProps,
  PhoneInputResolvedRootProps,
  PhoneInputResolvedValidationMessageProps,
  PhoneInputRootExternalProps,
  PhoneInputValidationMessageExternalProps,
  PhoneInputValidationState,
} from '../usePhoneInput';

interface PhoneInputPropGetterParameters {
  controlled: boolean;
  currentValue: PhoneValue;
  disabled: boolean;
  error: boolean;
  handleBlur(event: FocusEvent<HTMLInputElement>): void;
  handleCompositionEnd(event: CompositionEvent<HTMLInputElement>): void;
  handleCompositionStart(): void;
  handleInput(event: FormEvent<HTMLInputElement>): void;
  handleInputCapture(event: FormEvent<HTMLInputElement>): void;
  handlePaste(event: ClipboardEvent<HTMLInputElement>): void;
  inputId: string;
  numberingPlan: PhoneInputNumberingPlanState;
  readOnly: boolean;
  required: boolean;
  setInputRef: RefCallback<HTMLInputElement>;
  validation: PhoneInputValidationState;
  validationError: boolean;
  validationMessageId: string;
}

export interface PhoneInputPropGetters {
  getInputProps(
    externalProps?: PhoneInputInputExternalProps,
  ): PhoneInputResolvedInputProps;
  getRootProps(
    externalProps?: PhoneInputRootExternalProps,
  ): PhoneInputResolvedRootProps;
  getValidationMessageProps(
    externalProps?: PhoneInputValidationMessageExternalProps,
  ): PhoneInputResolvedValidationMessageProps;
}

function joinTokens(...values: Array<string | undefined>): string | undefined {
  const joined = [
    ...new Set(values.flatMap((value) => value?.split(/\s+/u).filter(Boolean) ?? [])),
  ].join(' ');
  return joined || undefined;
}

function booleanDataValue(value: boolean): 'false' | 'true' {
  return value ? 'true' : 'false';
}

export function usePhoneInputPropGetters(
  parameters: PhoneInputPropGetterParameters,
): PhoneInputPropGetters {
  const {
    controlled,
    currentValue,
    disabled,
    error,
    handleBlur,
    handleCompositionEnd,
    handleCompositionStart,
    handleInput,
    handleInputCapture,
    handlePaste,
    inputId,
    numberingPlan,
    readOnly,
    required,
    setInputRef,
    validation,
    validationError,
    validationMessageId,
  } = parameters;
  const getInputProps = useCallback(
    (
      externalProps: PhoneInputInputExternalProps = {},
    ): PhoneInputResolvedInputProps => {
      const {
        'aria-describedby': externalDescribedBy,
        onBlur,
        onCompositionEnd,
        onCompositionStart,
        onInput,
        onInputCapture,
        onPaste,
        ...rest
      } = externalProps;

      return {
        ...rest,
        'aria-describedby': validationError
          ? joinTokens(externalDescribedBy, validationMessageId)
          : externalDescribedBy,
        'aria-errormessage': validationError ? validationMessageId : undefined,
        'aria-invalid': error,
        'data-phone-input-accepted': booleanDataValue(validation.accepted),
        'data-phone-input-country': numberingPlan.selectedCountry ?? '',
        'data-phone-input-plan': numberingPlan.kind,
        'data-phone-input-status': validation.status,
        autoComplete: externalProps.autoComplete ?? 'tel',
        disabled,
        dir: 'ltr',
        id: inputId,
        inputMode: externalProps.inputMode ?? 'tel',
        onBlur: (event) => {
          onBlur?.(event);
          handleBlur(event);
        },
        onCompositionEnd: (event) => {
          onCompositionEnd?.(event);
          handleCompositionEnd(event);
        },
        onCompositionStart: (event) => {
          onCompositionStart?.(event);
          handleCompositionStart();
        },
        onInput: (event) => {
          onInput?.(event);
          handleInput(event);
        },
        onInputCapture: (event) => {
          onInputCapture?.(event);
          handleInputCapture(event);
        },
        onPaste: (event) => {
          onPaste?.(event);
          handlePaste(event);
        },
        readOnly,
        ref: setInputRef,
        required,
        value: currentValue ?? '',
      };
    },
    [
      currentValue,
      disabled,
      error,
      handleBlur,
      handleCompositionEnd,
      handleCompositionStart,
      handleInput,
      handleInputCapture,
      handlePaste,
      inputId,
      numberingPlan.kind,
      numberingPlan.selectedCountry,
      readOnly,
      required,
      setInputRef,
      validation.accepted,
      validation.status,
      validationError,
      validationMessageId,
    ],
  );
  const getRootProps = useCallback(
    (externalProps: PhoneInputRootExternalProps = {}): PhoneInputResolvedRootProps => ({
      ...externalProps,
      'data-phone-input-accepted': booleanDataValue(validation.accepted),
      'data-phone-input-country': numberingPlan.selectedCountry ?? '',
      'data-phone-input-controlled': booleanDataValue(controlled),
      'data-phone-input-plan': numberingPlan.kind,
      'data-phone-input-status': validation.status,
    }),
    [
      controlled,
      numberingPlan.kind,
      numberingPlan.selectedCountry,
      validation.accepted,
      validation.status,
    ],
  );
  const getValidationMessageProps = useCallback(
    (
      externalProps: PhoneInputValidationMessageExternalProps = {},
    ): PhoneInputResolvedValidationMessageProps => ({
      ...externalProps,
      'aria-live': 'polite',
      id: validationMessageId,
    }),
    [validationMessageId],
  );

  return {
    getInputProps,
    getRootProps,
    getValidationMessageProps,
  };
}
