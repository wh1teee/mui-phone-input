'use client';

import type { CountryCode, PhoneNumberType } from 'libphonenumber-js/max';
import {
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  type RefCallback,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  type PhoneCountrySelectionResult,
  resolvePhoneCountrySelection,
} from '../country-selector';
import { parseNationalPhoneValue, resolveNumberingPlan } from '../numbering-plan';
import {
  type PhoneValidationMode,
  type PhoneValidationOptions,
  validatePhoneValue,
} from '../phone-validation';
import {
  normalizePhoneInputText,
  type PhoneValue,
  parsePhoneValue,
} from '../phone-value';
import type {
  PhoneCountryChangeReason,
  PhoneInputChangeReason,
  PhoneInputNumberingPlanState,
  UsePhoneInputParameters,
} from '../usePhoneInput';
import type { InputEngineContext } from './input-transaction-engine';
import { useInputTransactionEngineBridge } from './use-input-transaction-engine';
import {
  assertPhoneCountry,
  type PhoneInputOwnership,
} from './use-phone-input-ownership';

type PendingTransaction = Readonly<{
  authoritativeNationalInput: boolean;
  displayValue: string;
  reason: PhoneInputChangeReason;
  selectedCountry: CountryCode | null;
}>;

type PendingBeforeInput = Readonly<{
  data: string | null;
  displayValue: string;
  inputType: string;
  isComposing: boolean;
  selection: readonly [start: number, end: number];
}>;

type PendingNationalInput = Readonly<{
  displayValue: string;
  rawValue: string;
}>;

type NationalInputResolution = Readonly<{
  pending: PendingNationalInput | null;
  value: Exclude<PhoneValue, undefined> | null;
}>;

type PendingCompositionSelection = Readonly<{
  canonicalValue: PhoneValue;
  digitOffset: number;
}>;

type CountryTransitionLedger = {
  initialized: boolean;
  numberingPlan: PhoneInputNumberingPlanState;
  value: PhoneValue;
};

type PendingCountryReconciliation = Readonly<{
  numberingPlan: PhoneInputNumberingPlanState;
  value: PhoneValue;
}>;

interface PhoneInputTransactionParameters {
  allowedNumberTypes?: readonly PhoneNumberType[];
  inputContext: InputEngineContext;
  numberingPlan: PhoneInputNumberingPlanState;
  onChange?: UsePhoneInputParameters['onChange'];
  onCountryChange?: UsePhoneInputParameters['onCountryChange'];
  onCountrySelection?: UsePhoneInputParameters['onCountrySelection'];
  ownership: PhoneInputOwnership;
  required: boolean;
  resetValidationVisibility(): void;
  validationMode: PhoneValidationMode;
}

export interface PhoneInputTransactions {
  clear(): void;
  focus(): void;
  handleCompositionEnd(event: CompositionEvent<HTMLInputElement>): void;
  handleCompositionStart(): void;
  handleInput(event: FormEvent<HTMLInputElement>): void;
  handleInputCapture(event: FormEvent<HTMLInputElement>): void;
  handlePaste(event: ClipboardEvent<HTMLInputElement>): void;
  inputElementRef: RefObject<HTMLInputElement | null>;
  reset(): void;
  selectCountry(country: CountryCode): PhoneCountrySelectionResult;
  setInputRef: RefCallback<HTMLInputElement>;
}

function countDigitsBeforeOffset(value: string, offset: number): number {
  return normalizePhoneInputText(value.slice(0, offset)).replace(/\D/gu, '').length;
}

function findOffsetAfterDigits(value: string, digitOffset: number): number {
  if (digitOffset <= 0) {
    return value.startsWith('+') ? 1 : 0;
  }

  let digits = 0;
  let offset = 0;
  for (const character of value) {
    offset += character.length;
    if (/\d/u.test(normalizePhoneInputText(character))) {
      digits += 1;
      if (digits === digitOffset) {
        return offset;
      }
    }
  }

  return value.length;
}

function resolveInputEventMetadata(event: Event): Readonly<{
  data: string | null;
  inputType: string;
  isComposing: boolean;
}> {
  const data = 'data' in event ? event.data : null;
  const inputType = 'inputType' in event ? event.inputType : undefined;
  const isComposing = 'isComposing' in event ? event.isComposing : undefined;

  return {
    data: typeof data === 'string' ? data : null,
    inputType: typeof inputType === 'string' ? inputType : '',
    isComposing: isComposing === true,
  };
}

function resolveCompleteNationalInput(
  displayValue: string,
  pendingBeforeInput: PendingBeforeInput | null,
  selectedCountry: CountryCode | null,
  pendingNationalInput: PendingNationalInput | null,
): NationalInputResolution {
  if (!pendingBeforeInput || !selectedCountry || pendingBeforeInput.isComposing) {
    return { pending: null, value: null };
  }

  const fullFieldEdit =
    pendingBeforeInput.selection[0] === 0 &&
    pendingBeforeInput.selection[1] === pendingBeforeInput.displayValue.length;
  let incomingValue: string | null = null;

  if (
    pendingBeforeInput.inputType === 'insertReplacementText' ||
    pendingBeforeInput.inputType === 'insertFromPaste'
  ) {
    if (fullFieldEdit) {
      incomingValue = pendingBeforeInput.data ?? displayValue;
    }
  } else if (pendingBeforeInput.inputType === 'insertText') {
    const appendsAtEnd =
      pendingBeforeInput.selection[0] === pendingBeforeInput.selection[1] &&
      pendingBeforeInput.selection[1] === pendingBeforeInput.displayValue.length;
    const data = pendingBeforeInput.data;

    if (appendsAtEnd && data !== null) {
      if (pendingNationalInput?.displayValue === pendingBeforeInput.displayValue) {
        incomingValue = `${pendingNationalInput.rawValue}${data}`;
      } else if (pendingBeforeInput.displayValue.length === 0 && data !== '+') {
        incomingValue = data;
      }
    }
  } else if (
    pendingBeforeInput.inputType.startsWith('delete') &&
    pendingNationalInput?.displayValue === pendingBeforeInput.displayValue
  ) {
    incomingValue = displayValue.startsWith('+') ? displayValue.slice(1) : displayValue;
  }

  if (
    incomingValue === null ||
    incomingValue.length === 0 ||
    incomingValue.includes('+') ||
    incomingValue === pendingBeforeInput.displayValue
  ) {
    return { pending: null, value: null };
  }

  const parsedValue = parseNationalPhoneValue(incomingValue, selectedCountry);
  const value =
    parsedValue !== null &&
    pendingBeforeInput.inputType === 'insertText' &&
    !validatePhoneValue(parsedValue, {
      selectedCountry,
      validationMode: 'valid',
    }).accepted
      ? null
      : parsedValue;
  return value === null
    ? {
        pending: {
          displayValue,
          rawValue: incomingValue,
        },
        value: null,
      }
    : { pending: null, value };
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

function countryReasonFromInputReason(
  reason: PhoneInputChangeReason,
): PhoneCountryChangeReason {
  if (reason === 'country-selection') {
    return 'user';
  }
  return reason === 'paste' ? 'paste' : 'input';
}

function hasCountryTransition(
  previous: PhoneInputNumberingPlanState,
  next: PhoneInputNumberingPlanState,
): boolean {
  return (
    previous.kind !== next.kind ||
    previous.selectedCountry !== next.selectedCountry ||
    previous.detectedCountry !== next.detectedCountry ||
    previous.resolvedCountry !== next.resolvedCountry
  );
}

function resolvePlanForCountry(
  value: PhoneValue,
  country: CountryCode | null,
): PhoneInputNumberingPlanState {
  return resolveNumberingPlan(
    value,
    country == null ? {} : { selectedCountry: country },
  );
}

export function usePhoneInputTransactions(
  parameters: PhoneInputTransactionParameters,
): PhoneInputTransactions {
  const {
    allowedNumberTypes,
    inputContext,
    numberingPlan,
    onChange,
    onCountryChange,
    onCountrySelection,
    ownership,
    required,
    resetValidationVisibility,
    validationMode,
  } = parameters;
  const {
    controlledRef,
    countryControlledRef,
    currentSelectedCountryRef,
    currentValue,
    currentValueRef,
    initialDefaultCountryRef,
    initialDefaultValueRef,
    setUncontrolledCountry,
    setUncontrolledValue,
  } = ownership;
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const beforeInputCleanupRef = useRef<(() => void) | null>(null);
  const engineCleanupRef = useRef<(() => void) | null>(null);
  const formCleanupRef = useRef<(() => void) | null>(null);
  const composingRef = useRef(false);
  const compositionTextRef = useRef<string | null>(null);
  const compositionDigitOffsetRef = useRef<number | null>(null);
  const pendingBeforeInputRef = useRef<PendingBeforeInput | null>(null);
  const pendingNationalInputRef = useRef<PendingNationalInput | null>(null);
  const pendingTransactionRef = useRef<PendingTransaction | null>(null);
  const pendingCommitScheduledRef = useRef(false);
  const pasteTransactionRef = useRef(false);
  const pasteResetFrameRef = useRef<number | undefined>(undefined);
  const lifecycleActiveRef = useRef(true);
  const lifecycleGenerationRef = useRef(0);
  const [pendingCompositionSelection, setPendingCompositionSelection] =
    useState<PendingCompositionSelection | null>(null);
  const engineBridge = useInputTransactionEngineBridge();
  const countryTransitionLedgerRef = useRef<CountryTransitionLedger>({
    initialized: false,
    numberingPlan: resolveNumberingPlan(undefined),
    value: undefined,
  });
  const pendingCountryReconciliationRef = useRef<PendingCountryReconciliation | null>(
    null,
  );
  const initialCountryTransitionReason: PhoneCountryChangeReason =
    controlledRef.current || countryControlledRef.current
      ? 'external-value'
      : 'default';

  const emitCountryTransition = useCallback(
    (
      previousNumberingPlan: PhoneInputNumberingPlanState,
      nextNumberingPlan: PhoneInputNumberingPlanState,
      previousValue: PhoneValue,
      nextValue: PhoneValue,
      reason: PhoneCountryChangeReason,
    ) => {
      countryTransitionLedgerRef.current = {
        initialized: true,
        numberingPlan: nextNumberingPlan,
        value: nextValue,
      };

      if (!hasCountryTransition(previousNumberingPlan, nextNumberingPlan)) {
        return;
      }

      onCountryChange?.(nextNumberingPlan.resolvedCountry, {
        country: nextNumberingPlan.resolvedCountry,
        numberingPlan: nextNumberingPlan,
        previousCountry: previousNumberingPlan.resolvedCountry,
        previousNumberingPlan,
        previousValue,
        reason,
        value: nextValue,
      });
    },
    [onCountryChange],
  );

  const reset = useCallback(() => {
    resetValidationVisibility();
    pendingNationalInputRef.current = null;
    const previousValue = currentValueRef.current;
    const previousSelectedCountry = currentSelectedCountryRef.current;
    const nextValue = controlledRef.current
      ? previousValue
      : initialDefaultValueRef.current;
    const nextSelectedCountry = countryControlledRef.current
      ? previousSelectedCountry
      : initialDefaultCountryRef.current;

    if (!controlledRef.current) {
      currentValueRef.current = nextValue;
      setUncontrolledValue(nextValue);
    }
    if (!countryControlledRef.current) {
      currentSelectedCountryRef.current = nextSelectedCountry;
      setUncontrolledCountry(nextSelectedCountry);
    }
    emitCountryTransition(
      resolvePlanForCountry(previousValue, previousSelectedCountry),
      resolvePlanForCountry(nextValue, nextSelectedCountry),
      previousValue,
      nextValue,
      'reset',
    );
  }, [
    controlledRef,
    countryControlledRef,
    currentSelectedCountryRef,
    currentValueRef,
    emitCountryTransition,
    initialDefaultCountryRef,
    initialDefaultValueRef,
    resetValidationVisibility,
    setUncontrolledCountry,
    setUncontrolledValue,
  ]);

  const setInputRef = useCallback<RefCallback<HTMLInputElement>>(
    (input) => {
      formCleanupRef.current?.();
      formCleanupRef.current = null;
      beforeInputCleanupRef.current?.();
      beforeInputCleanupRef.current = null;
      engineCleanupRef.current?.();
      engineCleanupRef.current = null;
      inputElementRef.current = input;

      if (input) {
        const handleBeforeInput = (event: Event) => {
          const metadata = resolveInputEventMetadata(event);
          const pendingBeforeInput: PendingBeforeInput = {
            data: metadata.data,
            displayValue: input.value,
            inputType: metadata.inputType,
            isComposing: metadata.isComposing,
            selection: [
              input.selectionStart ?? input.value.length,
              input.selectionEnd ?? input.value.length,
            ],
          };
          pendingBeforeInputRef.current = pendingBeforeInput;
          queueMicrotask(() => {
            if (pendingBeforeInputRef.current === pendingBeforeInput) {
              pendingBeforeInputRef.current = null;
            }
          });
        };
        input.addEventListener('beforeinput', handleBeforeInput, { capture: true });
        beforeInputCleanupRef.current = () =>
          input.removeEventListener('beforeinput', handleBeforeInput, {
            capture: true,
          });
        engineCleanupRef.current = engineBridge.attach(input);
      }

      const form = input?.form;
      if (form) {
        const handleReset = () => {
          const lifecycleGeneration = lifecycleGenerationRef.current;
          queueMicrotask(() => {
            if (
              lifecycleActiveRef.current &&
              lifecycleGenerationRef.current === lifecycleGeneration
            ) {
              reset();
            }
          });
        };
        form.addEventListener('reset', handleReset);
        formCleanupRef.current = () => form.removeEventListener('reset', handleReset);
      }
    },
    [engineBridge, reset],
  );

  const commit = useCallback(
    (
      displayValue: string,
      reason: PhoneInputChangeReason,
      nextSelectedCountry: CountryCode | null = currentSelectedCountryRef.current,
      previousSelectedCountry: CountryCode | null = currentSelectedCountryRef.current,
      authoritativeNationalInput = false,
    ) => {
      const nextValue = parsePhoneValue(displayValue);
      const previousValue = currentValueRef.current;
      const valueChanged = nextValue !== previousValue;
      const previousNumberingPlan = resolvePlanForCountry(
        previousValue,
        previousSelectedCountry,
      );
      const nextNumberingPlan = resolvePlanForCountry(nextValue, nextSelectedCountry);
      const nextValidationOptions: PhoneValidationOptions = {
        required,
        validationMode,
        ...(nextSelectedCountry == null
          ? {}
          : { selectedCountry: nextSelectedCountry }),
        ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
      };

      if (valueChanged) {
        currentValueRef.current = nextValue;
        if (!controlledRef.current) {
          setUncontrolledValue(nextValue);
        }
      }

      if (valueChanged || authoritativeNationalInput) {
        onChange?.(nextValue, {
          numberingPlan: nextNumberingPlan,
          previousValue,
          reason,
          validation: validatePhoneValue(nextValue, nextValidationOptions),
          value: nextValue,
        });
      }

      if (
        (controlledRef.current || countryControlledRef.current) &&
        hasCountryTransition(previousNumberingPlan, nextNumberingPlan)
      ) {
        pendingCountryReconciliationRef.current = {
          numberingPlan: nextNumberingPlan,
          value: nextValue,
        };
      }

      emitCountryTransition(
        previousNumberingPlan,
        nextNumberingPlan,
        previousValue,
        nextValue,
        countryReasonFromInputReason(reason),
      );
    },
    [
      allowedNumberTypes,
      controlledRef,
      countryControlledRef,
      currentSelectedCountryRef,
      currentValueRef,
      emitCountryTransition,
      onChange,
      required,
      setUncontrolledValue,
      validationMode,
    ],
  );

  const scheduleCommit = useCallback(
    (
      displayValue: string,
      reason: PhoneInputChangeReason,
      authoritativeNationalInput = false,
      selectedCountry: CountryCode | null = null,
    ) => {
      const pending = pendingTransactionRef.current;
      if (pending?.authoritativeNationalInput && !authoritativeNationalInput) {
        return;
      }
      const dropsTransientEmpty =
        displayValue.length === 0 &&
        pending !== null &&
        pending.displayValue.length > 0 &&
        reason !== 'delete' &&
        reason !== 'clear';
      const nextDisplayValue = dropsTransientEmpty
        ? pending.displayValue
        : displayValue;
      const nextReason = dropsTransientEmpty ? pending.reason : reason;

      pendingTransactionRef.current = {
        authoritativeNationalInput,
        displayValue: nextDisplayValue,
        reason: nextReason,
        selectedCountry,
      };

      if (pendingCommitScheduledRef.current) {
        return;
      }

      pendingCommitScheduledRef.current = true;
      const lifecycleGeneration = lifecycleGenerationRef.current;
      queueMicrotask(() => {
        if (
          !lifecycleActiveRef.current ||
          lifecycleGenerationRef.current !== lifecycleGeneration
        ) {
          return;
        }

        pendingCommitScheduledRef.current = false;
        const transaction = pendingTransactionRef.current;
        pendingTransactionRef.current = null;

        if (!composingRef.current && transaction) {
          const selectedCountry = transaction.authoritativeNationalInput
            ? transaction.selectedCountry
            : currentSelectedCountryRef.current;
          commit(
            transaction.displayValue,
            transaction.reason,
            selectedCountry,
            selectedCountry,
            transaction.authoritativeNationalInput,
          );
        }
      });
    },
    [commit, currentSelectedCountryRef],
  );

  const handlePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
    if (!event.defaultPrevented) {
      pasteTransactionRef.current = true;
      const lifecycleGeneration = lifecycleGenerationRef.current;

      if (pasteResetFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pasteResetFrameRef.current);
      }
      pasteResetFrameRef.current = window.requestAnimationFrame(() => {
        if (
          !lifecycleActiveRef.current ||
          lifecycleGenerationRef.current !== lifecycleGeneration
        ) {
          return;
        }

        pasteTransactionRef.current = false;
        pasteResetFrameRef.current = undefined;
      });
    }
  }, []);

  const handleInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const inputEvent = resolveInputEventMetadata(event.nativeEvent);
      const pendingBeforeInput = pendingBeforeInputRef.current;
      pendingBeforeInputRef.current = null;

      if (composingRef.current || inputEvent.isComposing) {
        return;
      }

      const selectedCountry = currentSelectedCountryRef.current;
      const previousDisplayValue = currentValueRef.current ?? '';
      const selectionStart = event.currentTarget.selectionStart;
      const selectionEnd = event.currentTarget.selectionEnd;
      const appendsAtEnd =
        selectionStart === event.currentTarget.value.length &&
        selectionEnd === event.currentTarget.value.length;
      const inferredBeforeInput =
        pendingBeforeInput === null && inputEvent.data !== null && appendsAtEnd
          ? {
              data: inputEvent.data,
              displayValue: previousDisplayValue,
              inputType: inputEvent.inputType || 'insertText',
              isComposing: false,
              selection: [
                previousDisplayValue.length,
                previousDisplayValue.length,
              ] as const,
            }
          : null;
      const inputEvidence = pendingBeforeInput ?? inferredBeforeInput;
      const nationalInput = resolveCompleteNationalInput(
        event.currentTarget.value,
        inputEvidence,
        selectedCountry,
        pendingNationalInputRef.current,
      );
      pendingNationalInputRef.current = nationalInput.pending;
      const displayValue = nationalInput.value ?? event.currentTarget.value;
      const nextValue = parsePhoneValue(displayValue);
      const pasted = pasteTransactionRef.current;
      const inputType = inputEvidence?.inputType || inputEvent.inputType || '';
      pasteTransactionRef.current = false;
      if (pasteResetFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pasteResetFrameRef.current);
        pasteResetFrameRef.current = undefined;
      }
      scheduleCommit(
        displayValue,
        resolveChangeReason(inputType, nextValue, pasted),
        nationalInput.value !== null,
        nationalInput.value === null ? null : selectedCountry,
      );
    },
    [currentSelectedCountryRef, currentValueRef, scheduleCommit],
  );

  const handleInputCapture = useCallback((event: FormEvent<HTMLInputElement>) => {
    const inputEvent = resolveInputEventMetadata(event.nativeEvent);

    if (composingRef.current || inputEvent.isComposing) {
      compositionTextRef.current = event.currentTarget.value;
      compositionDigitOffsetRef.current = countDigitsBeforeOffset(
        event.currentTarget.value,
        event.currentTarget.selectionStart ?? event.currentTarget.value.length,
      );
    }
  }, []);

  const handleCompositionStart = useCallback(() => {
    pendingCommitScheduledRef.current = false;
    pendingBeforeInputRef.current = null;
    pendingNationalInputRef.current = null;
    pendingTransactionRef.current = null;
    composingRef.current = true;
    compositionTextRef.current = null;
    compositionDigitOffsetRef.current = null;
    setPendingCompositionSelection(null);
  }, []);

  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      const displayValue = compositionTextRef.current ?? event.currentTarget.value;
      const digitOffset = compositionDigitOffsetRef.current;
      setPendingCompositionSelection(
        digitOffset === null
          ? null
          : {
              canonicalValue: parsePhoneValue(displayValue),
              digitOffset,
            },
      );
      commit(displayValue, 'composition');
      compositionTextRef.current = null;
      compositionDigitOffsetRef.current = null;
    },
    [commit],
  );

  useEffect(() => {
    const previous = countryTransitionLedgerRef.current;

    if (!previous.initialized) {
      emitCountryTransition(
        previous.numberingPlan,
        numberingPlan,
        previous.value,
        currentValue,
        initialCountryTransitionReason,
      );
      return;
    }

    const pendingReconciliation = pendingCountryReconciliationRef.current;
    pendingCountryReconciliationRef.current = null;
    const pendingValue = pendingReconciliation?.value;
    if (
      pendingReconciliation &&
      pendingValue === currentValue &&
      !hasCountryTransition(pendingReconciliation.numberingPlan, numberingPlan)
    ) {
      countryTransitionLedgerRef.current = {
        initialized: true,
        numberingPlan,
        value: currentValue,
      };
      return;
    }

    emitCountryTransition(
      previous.numberingPlan,
      numberingPlan,
      previous.value,
      currentValue,
      'external-value',
    );
  }, [
    currentValue,
    emitCountryTransition,
    initialCountryTransitionReason,
    numberingPlan,
  ]);

  useEffect(() => {
    const input = inputElementRef.current;
    const displayValue = currentValue ?? '';
    const reconcilesCompositionSelection =
      pendingCompositionSelection?.canonicalValue === currentValue;
    let selection: readonly [number, number];
    if (reconcilesCompositionSelection && pendingCompositionSelection) {
      const offset = findOffsetAfterDigits(
        displayValue,
        pendingCompositionSelection.digitOffset,
      );
      selection = [offset, offset];
    } else if (input) {
      selection = [
        input.selectionStart ?? displayValue.length,
        input.selectionEnd ?? displayValue.length,
      ];
    } else {
      selection = [displayValue.length, displayValue.length];
    }

    engineBridge.reconcileExternal({ displayValue, selection }, inputContext);
    if (pendingCompositionSelection) {
      setPendingCompositionSelection(null);
    }
  }, [currentValue, engineBridge, inputContext, pendingCompositionSelection]);

  useEffect(() => {
    lifecycleActiveRef.current = true;

    return () => {
      lifecycleActiveRef.current = false;
      lifecycleGenerationRef.current += 1;
      formCleanupRef.current?.();
      beforeInputCleanupRef.current?.();
      engineCleanupRef.current?.();
      pendingBeforeInputRef.current = null;
      pendingNationalInputRef.current = null;
      pendingTransactionRef.current = null;
      pendingCommitScheduledRef.current = false;
      composingRef.current = false;
      compositionTextRef.current = null;
      compositionDigitOffsetRef.current = null;
      pendingCountryReconciliationRef.current = null;
      if (pasteResetFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pasteResetFrameRef.current);
      }
      pasteResetFrameRef.current = undefined;
      pasteTransactionRef.current = false;
    };
  }, []);

  const focus = useCallback(() => inputElementRef.current?.focus(), []);
  const clear = useCallback(() => {
    pendingNationalInputRef.current = null;
    commit('', 'clear');
  }, [commit]);
  const selectCountry = useCallback(
    (country: CountryCode) => {
      assertPhoneCountry(country, 'selected');
      pendingNationalInputRef.current = null;
      const previousCountry = currentSelectedCountryRef.current;
      const previousValue = currentValueRef.current;
      const selection = resolvePhoneCountrySelection(previousValue, country);

      if (selection.status === 'applied') {
        if (!countryControlledRef.current) {
          currentSelectedCountryRef.current = country;
          setUncontrolledCountry(country);
        }

        commit(selection.value, 'country-selection', country, previousCountry);
      }

      onCountrySelection?.(selection);
      return selection;
    },
    [
      commit,
      countryControlledRef,
      currentSelectedCountryRef,
      currentValueRef,
      onCountrySelection,
      setUncontrolledCountry,
    ],
  );

  return {
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
  };
}
