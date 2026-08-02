'use client';

import { useDefaultProps } from '@mui/material/DefaultPropsProvider';
import {
  type ComponentsOverrides,
  type ComponentsVariants,
  styled,
} from '@mui/material/styles';
import TextField, { type TextFieldProps } from '@mui/material/TextField';
import { mergeSlotProps } from '@mui/material/utils';
import {
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  type ForwardedRef,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { InputEngineContext } from '../internal/input-transaction-engine';
import { useInputTransactionEngineBridge } from '../internal/use-input-transaction-engine';
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

export interface PhoneInputValidationState {
  isPossible: boolean | null;
  isValid: boolean | null;
  numberType: string | null;
  reason: 'empty' | 'not-evaluated';
}

export interface PhoneInputNumberingPlanState {
  countryCallingCode: string | null;
  kind: 'unresolved';
  possibleCountries: readonly string[];
}

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

function createValidationState(value: PhoneValue): PhoneInputValidationState {
  return {
    isPossible: null,
    isValid: null,
    numberType: null,
    reason: value === undefined ? 'empty' : 'not-evaluated',
  };
}

function createNumberingPlanState(): PhoneInputNumberingPlanState {
  return {
    countryCallingCode: null,
    kind: 'unresolved',
    possibleCountries: [],
  };
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
      classes: classesProp,
      className,
      defaultValue,
      disabled = false,
      error = false,
      onChange,
      required = false,
      slotProps,
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
    const [uncontrolledValue, setUncontrolledValue] = useState<PhoneValue>(() => {
      assertPhoneValue(defaultValue);
      return defaultValue;
    });

    assertPhoneValue(value);

    const currentValue = controlledRef.current ? value : uncontrolledValue;
    const currentValueRef = useRef(currentValue);
    currentValueRef.current = currentValue;

    const ownerState: MuiPhoneInputOwnerState = {
      controlled: controlledRef.current,
      disabled,
      empty: currentValue === undefined,
      error,
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
          numberingPlan: createNumberingPlanState(),
          previousValue,
          reason,
          validation: createValidationState(nextValue),
          value: nextValue,
        });
      },
      [onChange],
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

      engineBridge.reconcileExternal({ displayValue, selection }, E164_INPUT_CONTEXT);
    }, [currentValue, engineBridge]);

    useEffect(() => {
      const input = inputRef.current;
      const form = input?.form;

      if (!form || controlledRef.current) {
        return undefined;
      }

      const handleReset = () => {
        queueMicrotask(() => {
          currentValueRef.current = initialDefaultValueRef.current;
          setUncontrolledValue(initialDefaultValueRef.current);
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
      },
      [],
    );

    const htmlInputSlotProps = useMemo(
      () =>
        mergeSlotProps(slotProps?.htmlInput, {
          autoComplete: 'tel',
          className: classes.input,
          inputMode: 'tel',
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
        error={error}
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
