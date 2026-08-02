'use client';

import {
  type CountryCode,
  isSupportedCountry,
  type PhoneNumberType,
} from 'libphonenumber-js/max';
import {
  type ClipboardEvent,
  type ComponentPropsWithoutRef,
  type CompositionEvent,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
  type RefCallback,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { selectPhoneCountryValue } from './country-selector';
import type { InputEngineContext } from './internal/input-transaction-engine';
import { useInputTransactionEngineBridge } from './internal/use-input-transaction-engine';
import { type NumberingPlanResolution, resolveNumberingPlan } from './numbering-plan';
import {
  type PhoneValidationMode,
  type PhoneValidationOptions,
  type PhoneValidationResult,
  validatePhoneValue,
} from './phone-validation';
import { assertPhoneValue, type PhoneValue, parsePhoneValue } from './phone-value';

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

export interface PhoneCountryChangeDetails {
  country: CountryCode;
  previousCountry: CountryCode | null;
  previousValue: PhoneValue;
  value: PhoneValue;
}

export interface UsePhoneInputParameters {
  allowedNumberTypes?: readonly PhoneNumberType[];
  defaultCountry?: CountryCode | null;
  defaultValue?: PhoneValue;
  disabled?: boolean;
  error?: boolean;
  id?: string;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  onCountryChange?: (country: CountryCode, details: PhoneCountryChangeDetails) => void;
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
  selectCountry(country: CountryCode): void;
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

type PendingTransaction = Readonly<{
  displayValue: string;
  reason: PhoneInputChangeReason;
}>;

const E164_INPUT_CONTEXT: InputEngineContext = {
  fixedCallingCode: false,
  formatStrategyKey: 'e164',
  locale: 'en',
};

declare const process:
  | {
      env: {
        NODE_ENV?: string;
      };
    }
  | undefined;

function shouldWarnInDevelopment(): boolean {
  return typeof process === 'undefined' || process.env.NODE_ENV !== 'production';
}

function joinTokens(...values: Array<string | undefined>): string | undefined {
  const joined = values.filter(Boolean).join(' ');
  return joined || undefined;
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

function resolveChangeReason(
  inputType: string,
  value: PhoneValue,
  pasted: boolean,
): PhoneInputChangeReason {
  if (value === undefined) {
    return 'clear';
  }
  if (pasted || inputType === 'insertFromPaste') {
    return 'paste';
  }
  if (inputType === 'historyUndo') {
    return 'history-undo';
  }
  if (inputType === 'historyRedo') {
    return 'history-redo';
  }
  if (inputType === 'insertReplacementText') {
    return 'replacement';
  }
  if (inputType.startsWith('delete')) {
    return 'delete';
  }
  return 'input';
}

function booleanDataValue(value: boolean): 'false' | 'true' {
  return value ? 'true' : 'false';
}

function assertCountry(country: CountryCode | null | undefined, label: string): void {
  if (country != null && !isSupportedCountry(country)) {
    throw new TypeError(`Unsupported ${label} country: ${country}`);
  }
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
    onChange,
    onCountryChange,
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
  const hasValueProp = Object.hasOwn(parameters, 'value');
  const hasDefaultValueProp = Object.hasOwn(parameters, 'defaultValue');
  const hasSelectedCountryProp = Object.hasOwn(parameters, 'selectedCountry');
  const hasDefaultCountryProp = Object.hasOwn(parameters, 'defaultCountry');
  const isControlledNow = hasValueProp;
  const isCountryControlledNow = hasSelectedCountryProp;
  const controlledRef = useRef(isControlledNow);
  const countryControlledRef = useRef(isCountryControlledNow);
  const warnedAboutModeRef = useRef(false);
  const warnedAboutCountryModeRef = useRef(false);
  const warnedAboutOwnershipConflictRef = useRef(false);
  const warnedAboutCountryOwnershipConflictRef = useRef(false);
  const initialDefaultValueRef = useRef(defaultValue);
  const initialDefaultCountryRef = useRef(defaultCountry ?? null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const engineCleanupRef = useRef<(() => void) | null>(null);
  const formCleanupRef = useRef<(() => void) | null>(null);
  const composingRef = useRef(false);
  const compositionTextRef = useRef('');
  const pendingTransactionRef = useRef<PendingTransaction | null>(null);
  const pendingCommitScheduledRef = useRef(false);
  const pasteTransactionRef = useRef(false);
  const pasteResetFrameRef = useRef<number | undefined>(undefined);
  const validationBlurFrameRef = useRef<number | undefined>(undefined);
  const [validationBlurred, setValidationBlurred] = useState(false);
  const [uncontrolledValue, setUncontrolledValue] = useState<PhoneValue>(() => {
    assertPhoneValue(defaultValue);
    return defaultValue;
  });
  const [uncontrolledCountry, setUncontrolledCountry] = useState<CountryCode | null>(
    () => {
      assertCountry(defaultCountry, 'default');
      return defaultCountry ?? null;
    },
  );

  assertPhoneValue(value);
  assertCountry(selectedCountry, 'selected');

  const currentValue = controlledRef.current ? value : uncontrolledValue;
  const currentValueRef = useRef(currentValue);
  currentValueRef.current = currentValue;
  const currentSelectedCountry = countryControlledRef.current
    ? (selectedCountry ?? null)
    : uncontrolledCountry;
  const currentSelectedCountryRef = useRef(currentSelectedCountry);
  currentSelectedCountryRef.current = currentSelectedCountry;
  const numberingPlanOptions = useMemo(
    () =>
      currentSelectedCountry == null ? {} : { selectedCountry: currentSelectedCountry },
    [currentSelectedCountry],
  );
  const validationOptions = useMemo<PhoneValidationOptions>(
    () => ({
      required,
      validationMode,
      ...(currentSelectedCountry == null
        ? {}
        : { selectedCountry: currentSelectedCountry }),
      ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
    }),
    [allowedNumberTypes, currentSelectedCountry, required, validationMode],
  );
  const numberingPlan = useMemo(
    () => resolveNumberingPlan(currentValue, numberingPlanOptions),
    [currentValue, numberingPlanOptions],
  );
  const validation = useMemo(
    () => validatePhoneValue(currentValue, validationOptions),
    [currentValue, validationOptions],
  );
  const validationVisible =
    validationDisplay === 'always' ||
    (validationDisplay === 'blur' && validationBlurred);
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
  const engineBridge = useInputTransactionEngineBridge();

  const cancelValidationBlurFrame = useCallback(() => {
    if (validationBlurFrameRef.current !== undefined) {
      window.cancelAnimationFrame(validationBlurFrameRef.current);
      validationBlurFrameRef.current = undefined;
    }
  }, []);
  const resetState = useCallback(() => {
    cancelValidationBlurFrame();
    if (!controlledRef.current) {
      currentValueRef.current = initialDefaultValueRef.current;
      setUncontrolledValue(initialDefaultValueRef.current);
    }
    if (!countryControlledRef.current) {
      currentSelectedCountryRef.current = initialDefaultCountryRef.current;
      setUncontrolledCountry(initialDefaultCountryRef.current);
    }
    setValidationBlurred(false);
  }, [cancelValidationBlurFrame]);
  const setInputRef = useCallback<RefCallback<HTMLInputElement>>(
    (input) => {
      formCleanupRef.current?.();
      formCleanupRef.current = null;
      engineCleanupRef.current?.();
      engineCleanupRef.current = input ? engineBridge.attach(input) : null;
      inputElementRef.current = input;

      const form = input?.form;
      if (form) {
        const handleReset = () => queueMicrotask(resetState);
        form.addEventListener('reset', handleReset);
        formCleanupRef.current = () => form.removeEventListener('reset', handleReset);
      }
    },
    [engineBridge, resetState],
  );
  const commit = useCallback(
    (
      displayValue: string,
      reason: PhoneInputChangeReason,
      country: CountryCode | null = currentSelectedCountryRef.current,
    ) => {
      const nextValue = parsePhoneValue(displayValue);
      const previousValue = currentValueRef.current;

      if (nextValue === previousValue) {
        return;
      }

      currentValueRef.current = nextValue;
      if (!controlledRef.current) {
        setUncontrolledValue(nextValue);
      }

      const nextNumberingPlanOptions =
        country == null ? {} : { selectedCountry: country };
      const nextValidationOptions: PhoneValidationOptions = {
        required,
        validationMode,
        ...(country == null ? {} : { selectedCountry: country }),
        ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
      };

      onChange?.(nextValue, {
        numberingPlan: resolveNumberingPlan(nextValue, nextNumberingPlanOptions),
        previousValue,
        reason,
        validation: validatePhoneValue(nextValue, nextValidationOptions),
        value: nextValue,
      });
    },
    [allowedNumberTypes, onChange, required, validationMode],
  );
  const scheduleCommit = useCallback(
    (displayValue: string, reason: PhoneInputChangeReason) => {
      const pending = pendingTransactionRef.current;
      const nextDisplayValue =
        displayValue.length > 0 || pending === null || pending.displayValue.length === 0
          ? displayValue
          : pending.displayValue;
      const nextReason = reason === 'input' && pending ? pending.reason : reason;

      pendingTransactionRef.current = {
        displayValue: nextDisplayValue,
        reason: nextReason,
      };

      if (pendingCommitScheduledRef.current) {
        return;
      }

      pendingCommitScheduledRef.current = true;
      queueMicrotask(() => {
        pendingCommitScheduledRef.current = false;
        const transaction = pendingTransactionRef.current;
        pendingTransactionRef.current = null;

        if (!composingRef.current && transaction) {
          commit(transaction.displayValue, transaction.reason);
        }
      });
    },
    [commit],
  );
  const handlePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    if (!event.defaultPrevented) {
      pasteTransactionRef.current = true;

      if (pasteResetFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pasteResetFrameRef.current);
      }
      pasteResetFrameRef.current = window.requestAnimationFrame(() => {
        pasteTransactionRef.current = false;
        pasteResetFrameRef.current = undefined;
      });
    }
  }, []);
  const handleInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const inputEvent = event.nativeEvent as InputEvent;

      if (composingRef.current || inputEvent.isComposing) {
        compositionTextRef.current = inputEvent.data ?? event.currentTarget.value;
        return;
      }

      const displayValue = event.currentTarget.value;
      const nextValue = parsePhoneValue(displayValue);
      scheduleCommit(
        displayValue,
        resolveChangeReason(
          inputEvent.inputType,
          nextValue,
          pasteTransactionRef.current,
        ),
      );
    },
    [scheduleCommit],
  );
  const handleCompositionStart = useCallback(() => {
    pendingCommitScheduledRef.current = false;
    pendingTransactionRef.current = null;
    composingRef.current = true;
    compositionTextRef.current = '';
  }, []);
  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      commit(
        event.data || compositionTextRef.current || event.currentTarget.value,
        'composition',
      );
      compositionTextRef.current = '';
    },
    [commit],
  );
  const handleBlur = useCallback(
    (_event: FocusEvent<HTMLInputElement>) => {
      cancelValidationBlurFrame();
      validationBlurFrameRef.current = window.requestAnimationFrame(() => {
        validationBlurFrameRef.current = undefined;
        setValidationBlurred(true);
      });
    },
    [cancelValidationBlurFrame],
  );

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      isControlledNow !== controlledRef.current &&
      !warnedAboutModeRef.current
    ) {
      warnedAboutModeRef.current = true;
      console.error(
        `${diagnosticName} cannot switch between controlled and uncontrolled ownership after mount.`,
      );
    }
  }, [diagnosticName, isControlledNow]);

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      isCountryControlledNow !== countryControlledRef.current &&
      !warnedAboutCountryModeRef.current
    ) {
      warnedAboutCountryModeRef.current = true;
      console.error(
        `${diagnosticName} cannot switch selectedCountry between controlled and uncontrolled ownership after mount.`,
      );
    }
  }, [diagnosticName, isCountryControlledNow]);

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      hasValueProp &&
      hasDefaultValueProp &&
      !warnedAboutOwnershipConflictRef.current
    ) {
      warnedAboutOwnershipConflictRef.current = true;
      console.error(
        `${diagnosticName} received both value and defaultValue; value controls ownership.`,
      );
    }
  }, [diagnosticName, hasDefaultValueProp, hasValueProp]);

  useEffect(() => {
    if (
      shouldWarnInDevelopment() &&
      hasSelectedCountryProp &&
      hasDefaultCountryProp &&
      !warnedAboutCountryOwnershipConflictRef.current
    ) {
      warnedAboutCountryOwnershipConflictRef.current = true;
      console.error(
        `${diagnosticName} received both selectedCountry and defaultCountry; selectedCountry controls country ownership.`,
      );
    }
  }, [diagnosticName, hasDefaultCountryProp, hasSelectedCountryProp]);

  useEffect(() => {
    const input = inputElementRef.current;
    const displayValue = currentValue ?? '';
    const selection = input
      ? ([
          input.selectionStart ?? displayValue.length,
          input.selectionEnd ?? displayValue.length,
        ] as const)
      : ([displayValue.length, displayValue.length] as const);

    engineBridge.reconcileExternal({ displayValue, selection }, inputContext);
  }, [currentValue, engineBridge, inputContext]);

  useEffect(
    () => () => {
      formCleanupRef.current?.();
      engineCleanupRef.current?.();
      if (pasteResetFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pasteResetFrameRef.current);
      }
      cancelValidationBlurFrame();
    },
    [cancelValidationBlurFrame],
  );

  const focus = useCallback(() => inputElementRef.current?.focus(), []);
  const clear = useCallback(() => commit('', 'clear'), [commit]);
  const selectCountry = useCallback(
    (country: CountryCode) => {
      assertCountry(country, 'selected');
      const previousCountry = currentSelectedCountryRef.current;
      const previousValue = currentValueRef.current;
      const nextValue = selectPhoneCountryValue(previousValue, country);

      if (!countryControlledRef.current) {
        currentSelectedCountryRef.current = country;
        setUncontrolledCountry(country);
      }

      commit(nextValue ?? '', 'country-selection', country);
      if (country !== previousCountry) {
        onCountryChange?.(country, {
          country,
          previousCountry,
          previousValue,
          value: nextValue,
        });
      }
    },
    [commit, onCountryChange],
  );
  const actions = useMemo<PhoneInputActions>(
    () => ({ clear, focus, reset: resetState, selectCountry }),
    [clear, focus, resetState, selectCountry],
  );
  const state = useMemo<PhoneInputState>(
    () => ({
      controlled: controlledRef.current,
      countryControlled: countryControlledRef.current,
      disabled,
      displayValue: currentValue ?? '',
      empty: currentValue === undefined,
      error: resolvedError,
      inputId,
      numberingPlan,
      readOnly,
      required,
      selectedCountry: numberingPlan.selectedCountry,
      validation,
      validationError,
      validationMessage: resolvedValidationMessage,
      validationMessageId,
      validationVisible,
      value: currentValue,
    }),
    [
      currentValue,
      disabled,
      inputId,
      numberingPlan,
      readOnly,
      required,
      resolvedError,
      resolvedValidationMessage,
      validation,
      validationError,
      validationMessageId,
      validationVisible,
    ],
  );
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
        onPaste,
        ...rest
      } = externalProps;

      return {
        ...rest,
        'aria-describedby': validationError
          ? joinTokens(externalDescribedBy, validationMessageId)
          : externalDescribedBy,
        'aria-errormessage': validationError ? validationMessageId : undefined,
        'aria-invalid': state.error,
        'data-phone-input-accepted': booleanDataValue(validation.accepted),
        'data-phone-input-country': numberingPlan.selectedCountry ?? '',
        'data-phone-input-plan': numberingPlan.kind,
        'data-phone-input-status': validation.status,
        autoComplete: externalProps.autoComplete ?? 'tel',
        disabled,
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
      handleBlur,
      handleCompositionEnd,
      handleCompositionStart,
      handleInput,
      handlePaste,
      inputId,
      numberingPlan.kind,
      numberingPlan.selectedCountry,
      readOnly,
      required,
      setInputRef,
      state.error,
      validationError,
      validation.accepted,
      validation.status,
      validationMessageId,
    ],
  );
  const getRootProps = useCallback(
    (externalProps: PhoneInputRootExternalProps = {}): PhoneInputResolvedRootProps => ({
      ...externalProps,
      'data-phone-input-accepted': booleanDataValue(validation.accepted),
      'data-phone-input-country': numberingPlan.selectedCountry ?? '',
      'data-phone-input-controlled': booleanDataValue(controlledRef.current),
      'data-phone-input-plan': numberingPlan.kind,
      'data-phone-input-status': validation.status,
    }),
    [
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
