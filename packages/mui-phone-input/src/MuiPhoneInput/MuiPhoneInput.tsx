'use client';

import { useDefaultProps } from '@mui/material/DefaultPropsProvider';
import {
  type ComponentsOverrides,
  type ComponentsVariants,
  styled,
} from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { mergeSlotProps } from '@mui/material/utils';
import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import {
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  type ForwardedRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type ReactNode,
  type RefAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { InputEngineContext } from '../internal/input-transaction-engine';
import { useInputTransactionEngineBridge } from '../internal/use-input-transaction-engine';
import { type NumberingPlanResolution, resolveNumberingPlan } from '../numbering-plan';
import {
  type PhoneValidationMode,
  type PhoneValidationOptions,
  type PhoneValidationResult,
  validatePhoneValue,
} from '../phone-validation';
import { assertPhoneValue, type PhoneValue, parsePhoneValue } from '../phone-value';
import {
  getMuiPhoneInputUtilityClass,
  type MuiPhoneInputClasses,
  type MuiPhoneInputClassKey,
  muiPhoneInputClasses,
} from './muiPhoneInputClasses';

export type PhoneInputChangeReason =
  | 'input'
  | 'delete'
  | 'clear'
  | 'paste'
  | 'replacement'
  | 'composition'
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

export type MuiPhoneInputProps = Omit<
  TextFieldProps,
  'classes' | 'defaultValue' | 'inputRef' | 'onChange' | 'value'
> & {
  classes?: Partial<MuiPhoneInputClasses>;
  defaultValue?: PhoneValue;
  onChange?: (value: PhoneValue, details: PhoneInputChangeDetails) => void;
  selectedCountry?: CountryCode | null;
  allowedNumberTypes?: readonly PhoneNumberType[];
  validationDisplay?: PhoneValidationDisplay;
  validationMessage?:
    | ReactNode
    | ((validation: PhoneInputValidationState) => ReactNode);
  validationMode?: PhoneValidationMode;
  value?: PhoneValue;
};

type MuiPhoneInputOwnerState = Readonly<{
  controlled: boolean;
  disabled: boolean;
  empty: boolean;
  error: boolean;
  required: boolean;
}>;

type PendingTransaction = Readonly<{
  displayValue: string;
  reason: PhoneInputChangeReason;
}>;

const E164_INPUT_CONTEXT: InputEngineContext = {
  fixedCallingCode: false,
  formatStrategyKey: 'e164',
  locale: 'en',
};

const MuiPhoneInputRoot = styled(TextField, {
  name: 'MuiPhoneInput',
  slot: 'Root',
  overridesResolver: (_props, styles) => [
    styles.root,
    styles.input && {
      [`& .${muiPhoneInputClasses.input}`]: styles.input,
    },
  ],
})<{ ownerState: MuiPhoneInputOwnerState }>({});

declare const process: {
  env: {
    NODE_ENV?: string;
  };
};

function joinClassNames(...values: Array<string | undefined>): string | undefined {
  const className = values.filter(Boolean).join(' ');
  return className || undefined;
}

function shouldWarnInDevelopment(): boolean {
  return process.env.NODE_ENV !== 'production';
}

function assignInputRef(
  ref: ForwardedRef<HTMLInputElement>,
  input: HTMLInputElement | null,
): void {
  if (typeof ref === 'function') {
    ref(input);
  } else if (ref) {
    ref.current = input;
  }
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

function useUtilityClasses(
  classes: Partial<MuiPhoneInputClasses> | undefined,
): MuiPhoneInputClasses {
  return {
    input: joinClassNames(muiPhoneInputClasses.input, classes?.input) ?? '',
    root: joinClassNames(muiPhoneInputClasses.root, classes?.root) ?? '',
  };
}

export const MuiPhoneInput: ForwardRefExoticComponent<
  MuiPhoneInputProps & RefAttributes<HTMLInputElement>
> = forwardRef<HTMLInputElement, MuiPhoneInputProps>(
  function MuiPhoneInput(inProps, forwardedRef) {
    const props = useDefaultProps({ name: 'MuiPhoneInput', props: inProps });
    const {
      allowedNumberTypes,
      classes: classesProp,
      className,
      defaultValue,
      disabled = false,
      error = false,
      helperText,
      onChange,
      required = false,
      selectedCountry,
      slotProps,
      validationDisplay = 'blur',
      validationMessage,
      validationMode = 'possible',
      value,
      ...other
    } = props;
    const isControlledNow = Object.hasOwn(props, 'value');
    const controlledRef = useRef(isControlledNow);
    const warnedAboutModeRef = useRef(false);
    const warnedAboutOwnershipConflictRef = useRef(false);
    const initialDefaultValueRef = useRef(defaultValue);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const engineCleanupRef = useRef<(() => void) | null>(null);
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

    assertPhoneValue(value);

    const currentValue = controlledRef.current ? value : uncontrolledValue;
    const currentValueRef = useRef(currentValue);
    currentValueRef.current = currentValue;
    const numberingPlanOptions = useMemo(
      () => (selectedCountry == null ? {} : { selectedCountry }),
      [selectedCountry],
    );
    const validationOptions = useMemo<PhoneValidationOptions>(
      () => ({
        required,
        validationMode,
        ...(selectedCountry == null ? {} : { selectedCountry }),
        ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
      }),
      [allowedNumberTypes, required, selectedCountry, validationMode],
    );
    const currentNumberingPlan = useMemo(
      () => resolveNumberingPlan(currentValue, numberingPlanOptions),
      [currentValue, numberingPlanOptions],
    );
    const currentValidation = useMemo(
      () => validatePhoneValue(currentValue, validationOptions),
      [currentValue, validationOptions],
    );
    const validationVisible =
      validationDisplay === 'always' ||
      (validationDisplay === 'blur' && validationBlurred);
    const validationError = validationVisible && !currentValidation.accepted;
    const resolvedError = error || validationError;
    const resolvedHelperText =
      helperText !== undefined
        ? helperText
        : validationError
          ? resolveValidationMessage(validationMessage, currentValidation)
          : undefined;
    const inputContext = useMemo<InputEngineContext>(
      () => ({
        ...E164_INPUT_CONTEXT,
        ...(currentNumberingPlan.resolvedCountry
          ? { country: currentNumberingPlan.resolvedCountry }
          : {}),
      }),
      [currentNumberingPlan.resolvedCountry],
    );

    const ownerState: MuiPhoneInputOwnerState = {
      controlled: controlledRef.current,
      disabled,
      empty: currentValue === undefined,
      error: resolvedError,
      required,
    };
    const classes = useUtilityClasses(classesProp);
    const engineBridge = useInputTransactionEngineBridge();
    const setInputRef = useCallback(
      (input: HTMLInputElement | null) => {
        engineCleanupRef.current?.();
        engineCleanupRef.current = input ? engineBridge.attach(input) : null;
        inputRef.current = input;
        assignInputRef(forwardedRef, input);
      },
      [engineBridge, forwardedRef],
    );
    const commit = useCallback(
      (displayValue: string, reason: PhoneInputChangeReason) => {
        const nextValue = parsePhoneValue(displayValue);
        const previousValue = currentValueRef.current;

        if (nextValue === previousValue) {
          return;
        }

        currentValueRef.current = nextValue;
        if (!controlledRef.current) {
          setUncontrolledValue(nextValue);
        }

        onChange?.(nextValue, {
          numberingPlan: resolveNumberingPlan(nextValue, numberingPlanOptions),
          previousValue,
          reason,
          validation: validatePhoneValue(nextValue, validationOptions),
          value: nextValue,
        });
      },
      [numberingPlanOptions, onChange, validationOptions],
    );
    const scheduleCommit = useCallback(
      (displayValue: string, reason: PhoneInputChangeReason) => {
        const pending = pendingTransactionRef.current;
        const nextDisplayValue =
          displayValue.length > 0 ||
          pending === null ||
          pending.displayValue.length === 0
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

    useEffect(() => {
      if (
        shouldWarnInDevelopment() &&
        isControlledNow !== controlledRef.current &&
        !warnedAboutModeRef.current
      ) {
        warnedAboutModeRef.current = true;
        console.error(
          'MuiPhoneInput cannot switch between controlled and uncontrolled ownership after mount.',
        );
      }
    }, [isControlledNow]);

    useEffect(() => {
      if (
        shouldWarnInDevelopment() &&
        Object.hasOwn(props, 'value') &&
        Object.hasOwn(props, 'defaultValue') &&
        !warnedAboutOwnershipConflictRef.current
      ) {
        warnedAboutOwnershipConflictRef.current = true;
        console.error(
          'MuiPhoneInput received both value and defaultValue; value controls ownership.',
        );
      }
    }, [props]);

    useEffect(() => {
      const input = inputRef.current;
      const displayValue = currentValue ?? '';
      const selection = input
        ? ([
            input.selectionStart ?? displayValue.length,
            input.selectionEnd ?? displayValue.length,
          ] as const)
        : ([displayValue.length, displayValue.length] as const);

      engineBridge.reconcileExternal({ displayValue, selection }, inputContext);
    }, [currentValue, engineBridge, inputContext]);

    useEffect(() => {
      const input = inputRef.current;
      const form = input?.form;

      if (!form || controlledRef.current) {
        return undefined;
      }

      const handleReset = () => {
        if (validationBlurFrameRef.current !== undefined) {
          window.cancelAnimationFrame(validationBlurFrameRef.current);
          validationBlurFrameRef.current = undefined;
        }
        queueMicrotask(() => {
          currentValueRef.current = initialDefaultValueRef.current;
          setUncontrolledValue(initialDefaultValueRef.current);
          setValidationBlurred(false);
        });
      };

      form.addEventListener('reset', handleReset);
      return () => form.removeEventListener('reset', handleReset);
    }, []);

    useEffect(
      () => () => {
        if (pasteResetFrameRef.current !== undefined) {
          window.cancelAnimationFrame(pasteResetFrameRef.current);
        }
        if (validationBlurFrameRef.current !== undefined) {
          window.cancelAnimationFrame(validationBlurFrameRef.current);
        }
      },
      [],
    );

    const htmlInputSlotProps = useMemo(
      () =>
        mergeSlotProps(slotProps?.htmlInput, {
          autoComplete: 'tel',
          className: classes.input,
          inputMode: 'tel',
          onBlur: () => {
            if (validationBlurFrameRef.current !== undefined) {
              window.cancelAnimationFrame(validationBlurFrameRef.current);
            }
            validationBlurFrameRef.current = window.requestAnimationFrame(() => {
              validationBlurFrameRef.current = undefined;
              setValidationBlurred(true);
            });
          },
          onCompositionEnd: handleCompositionEnd,
          onCompositionStart: () => {
            pendingCommitScheduledRef.current = false;
            pendingTransactionRef.current = null;
            composingRef.current = true;
            compositionTextRef.current = '';
          },
          onInput: handleInput,
          onPaste: handlePaste,
        }),
      [
        classes.input,
        handleCompositionEnd,
        handleInput,
        handlePaste,
        slotProps?.htmlInput,
      ],
    );

    return (
      <MuiPhoneInputRoot
        {...other}
        className={joinClassNames(classes.root, className)}
        disabled={disabled}
        error={resolvedError}
        helperText={resolvedHelperText}
        inputRef={setInputRef}
        ownerState={ownerState}
        required={required}
        slotProps={{ ...slotProps, htmlInput: htmlInputSlotProps }}
        value={currentValue ?? ''}
      />
    );
  },
);

declare module '@mui/material/styles' {
  interface ComponentsPropsList {
    MuiPhoneInput: MuiPhoneInputProps;
  }

  interface ComponentNameToClassKey {
    MuiPhoneInput: MuiPhoneInputClassKey;
  }

  interface Components<Theme = unknown> {
    MuiPhoneInput?: {
      defaultProps?: ComponentsPropsList['MuiPhoneInput'];
      styleOverrides?: ComponentsOverrides<Theme>['MuiPhoneInput'];
      variants?: ComponentsVariants<Theme>['MuiPhoneInput'];
    };
  }
}

export { getMuiPhoneInputUtilityClass, muiPhoneInputClasses };
