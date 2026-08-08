'use client';

import {
  getCountryCallingCode,
  parseIncompletePhoneNumber,
} from 'libphonenumber-js/core';
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
  hasPhoneExtensionSyntax,
  parsePhoneExtension,
  parsePhoneExtensionBearingText,
  parseRfc3966,
  type PhoneExtension,
} from '../phone-extension';
import {
  formatPhoneInputPresentation,
  logicalCaretFromDisplayOffset,
  parsePhoneInputPresentation,
  type PhoneInputPresentation,
} from '../phone-formatting';
import {
  type PhoneValidationMode,
  type PhoneValidationOptions,
  validatePhoneValue,
} from '../phone-validation';
import type { PhoneMetadata } from '../phone-metadata';
import { normalizePhoneInputDigit, type PhoneValue } from '../phone-value';
import type {
  PhoneCountryChangeReason,
  PhoneExtensionChangeReason,
  PhoneInputChangeReason,
  PhoneInputNumberingPlanState,
  UsePhoneInputParameters,
} from '../usePhoneInput';
import {
  type InputEngineContext,
  type InputTransactionSource,
  resolveInputTransactionSource,
} from './input-transaction-engine';
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

type PendingCompositionCommit = Readonly<{
  data: string;
  displayValue: string;
  selection: PendingCompositionSelection | null;
  source: Extract<InputTransactionSource, 'composition' | 'insert'>;
}>;

type PendingLogicalSelection = readonly [start: number, end: number];

type CapturedInput = Readonly<{
  displayValue: string;
  selection: readonly [start: number, end: number];
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
  extensionMaxLength?: number;
  inputContext: InputEngineContext;
  metadata: PhoneMetadata;
  numberingPlan: PhoneInputNumberingPlanState;
  presentation: PhoneInputPresentation;
  onChange?: UsePhoneInputParameters['onChange'];
  onCountryChange?: UsePhoneInputParameters['onCountryChange'];
  onCountrySelection?: UsePhoneInputParameters['onCountrySelection'];
  onExtensionChange?: UsePhoneInputParameters['onExtensionChange'];
  ownership: PhoneInputOwnership;
  required: boolean;
  resetValidationVisibility(): void;
  validationMode: PhoneValidationMode;
}

export interface PhoneInputTransactions {
  clear(): void;
  extensionInputElementRef: RefObject<HTMLInputElement | null>;
  focus(): void;
  handleCompositionEnd(event: CompositionEvent<HTMLInputElement>): void;
  handleCompositionStart(): void;
  handleInput(event: FormEvent<HTMLInputElement>): void;
  handleInputCapture(event: FormEvent<HTMLInputElement>): void;
  handleExtensionInput(event: FormEvent<HTMLInputElement>): void;
  handlePaste(event: ClipboardEvent<HTMLInputElement>): void;
  inputElementRef: RefObject<HTMLInputElement | null>;
  reset(): void;
  selectCountry(country: CountryCode): PhoneCountrySelectionResult;
  setExtensionInputRef: RefCallback<HTMLInputElement>;
  setInputRef: RefCallback<HTMLInputElement>;
}

function countDigitsBeforeOffset(value: string, offset: number): number {
  let count = 0;
  for (const character of value.slice(0, offset)) {
    if (normalizePhoneInputDigit(character) !== undefined) {
      count += 1;
    }
  }
  return count;
}

function normalizeObservedDisplayValue(value: string): string {
  let normalized = '';
  for (const character of value) {
    normalized += normalizePhoneInputDigit(character) ?? character;
  }
  return parseIncompletePhoneNumber(normalized);
}

function resolveObservedLogicalPosition(
  observedDisplayValue: string,
  offset: number,
  nextValue: PhoneValue,
  country: CountryCode | undefined,
  displayMode: InputEngineContext['displayMode'],
  metadata: PhoneMetadata,
): number {
  const rawDigitOffset = countDigitsBeforeOffset(observedDisplayValue, offset);

  if (
    observedDisplayValue.trimStart().startsWith('+') ||
    displayMode !== 'national' ||
    !country ||
    !nextValue
  ) {
    return rawDigitOffset;
  }

  const callingCode = getCountryCallingCode(country, metadata);
  const canonicalDigits = nextValue.slice(1);
  if (!canonicalDigits.startsWith(callingCode)) {
    return rawDigitOffset;
  }

  const nationalDigits = canonicalDigits.slice(callingCode.length);
  let rawDigits = '';
  for (const character of observedDisplayValue) {
    rawDigits += normalizePhoneInputDigit(character) ?? '';
  }
  const syntheticPrefixDigits = rawDigits.endsWith(nationalDigits)
    ? Math.max(0, rawDigits.length - nationalDigits.length)
    : 0;

  return callingCode.length + Math.max(0, rawDigitOffset - syntheticPrefixDigits);
}

function findOffsetAfterDigits(value: string, digitOffset: number): number {
  if (digitOffset <= 0) {
    return value.startsWith('+') ? 1 : 0;
  }

  let digits = 0;
  let offset = 0;
  for (const character of value) {
    offset += character.length;
    if (normalizePhoneInputDigit(character) !== undefined) {
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
  source: InputTransactionSource,
  selectedCountry: CountryCode | null,
  pendingNationalInput: PendingNationalInput | null,
  metadata: PhoneMetadata,
): NationalInputResolution {
  if (!pendingBeforeInput || !selectedCountry) {
    return { pending: null, value: null };
  }

  const fullFieldEdit =
    pendingBeforeInput.selection[0] === 0 &&
    pendingBeforeInput.selection[1] === pendingBeforeInput.displayValue.length;
  let incomingValue: string | null = null;

  if (source === 'autofill' || source === 'paste') {
    if (fullFieldEdit) {
      incomingValue = pendingBeforeInput.data ?? displayValue;
    }
  } else if (source === 'insert') {
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
    (source === 'delete-backward' || source === 'delete-forward') &&
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

  const parsedValue = parseNationalPhoneValue(incomingValue, selectedCountry, {
    metadata,
  });
  const value =
    parsedValue !== null &&
    source === 'insert' &&
    !validatePhoneValue(parsedValue, {
      metadata,
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

function rejectsInvalidNationalReplacement(
  pendingBeforeInput: PendingBeforeInput | null,
  source: InputTransactionSource,
  selectedCountry: CountryCode | null,
  metadata: PhoneMetadata,
): boolean {
  if (!pendingBeforeInput || !selectedCountry) {
    return false;
  }
  if (source !== 'autofill' && source !== 'paste') {
    return false;
  }

  const fullFieldEdit =
    pendingBeforeInput.selection[0] === 0 &&
    pendingBeforeInput.selection[1] === pendingBeforeInput.displayValue.length;
  const incomingValue = pendingBeforeInput.data;

  return (
    fullFieldEdit &&
    incomingValue !== null &&
    incomingValue.length > 0 &&
    !incomingValue.includes('+') &&
    parseNationalPhoneValue(incomingValue, selectedCountry, { metadata }) === null
  );
}

function resolveChangeReason(
  source: InputTransactionSource,
  value: PhoneValue,
): PhoneInputChangeReason {
  switch (source) {
    case 'paste':
      return 'paste';
    case 'history-undo':
      return 'history-undo';
    case 'history-redo':
      return 'history-redo';
    case 'delete-backward':
    case 'delete-forward':
      return value === undefined ? 'clear' : 'delete';
    case 'autofill':
    case 'predictive-replacement':
    case 'range-replacement':
      return 'replacement';
    case 'composition':
      return 'composition';
    case 'insert':
      return value === undefined ? 'clear' : 'input';
  }
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
  metadata: PhoneMetadata,
): PhoneInputNumberingPlanState {
  return resolveNumberingPlan(
    value,
    country == null ? { metadata } : { metadata, selectedCountry: country },
  );
}

export function usePhoneInputTransactions(
  parameters: PhoneInputTransactionParameters,
): PhoneInputTransactions {
  const {
    allowedNumberTypes,
    extensionMaxLength,
    inputContext,
    metadata,
    numberingPlan,
    presentation,
    onChange,
    onCountryChange,
    onCountrySelection,
    onExtensionChange,
    ownership,
    required,
    resetValidationVisibility,
    validationMode,
  } = parameters;
  const {
    controlledRef,
    countryControlledRef,
    currentExtension,
    currentExtensionRef,
    currentSelectedCountryRef,
    currentValue,
    currentValueRef,
    initialDefaultCountryRef,
    initialDefaultExtensionRef,
    initialDefaultValueRef,
    extensionControlledRef,
    setUncontrolledCountry,
    setUncontrolledExtension,
    setUncontrolledValue,
  } = ownership;
  const extensionInputElementRef = useRef<HTMLInputElement | null>(null);
  const inputElementRef = useRef<HTMLInputElement | null>(null);
  const renderedExtensionRef = useRef(currentExtension);
  renderedExtensionRef.current = currentExtension;
  const beforeInputCleanupRef = useRef<(() => void) | null>(null);
  const engineCleanupRef = useRef<(() => void) | null>(null);
  const formCleanupRef = useRef<(() => void) | null>(null);
  const composingRef = useRef(false);
  const compositionTextRef = useRef<string | null>(null);
  const compositionDigitOffsetRef = useRef<number | null>(null);
  const pendingCompositionCommitRef = useRef<PendingCompositionCommit | null>(null);
  const capturedInputRef = useRef<CapturedInput | null>(null);
  const pendingBeforeInputRef = useRef<PendingBeforeInput | null>(null);
  const pendingNationalInputRef = useRef<PendingNationalInput | null>(null);
  const pendingTransactionRef = useRef<PendingTransaction | null>(null);
  const pendingLogicalSelectionRef = useRef<PendingLogicalSelection | null>(null);
  const pendingCommitScheduledRef = useRef(false);
  const pasteTransactionRef = useRef(false);
  const pasteResetFrameRef = useRef<number | undefined>(undefined);
  const lifecycleActiveRef = useRef(true);
  const lifecycleGenerationRef = useRef(0);
  const [pendingCompositionSelection, setPendingCompositionSelection] =
    useState<PendingCompositionSelection | null>(null);
  const engineBridge = useInputTransactionEngineBridge(inputContext);
  const previousPresentationRef = useRef(presentation);
  const previousPresentation = previousPresentationRef.current;
  const inputDuringRender = inputElementRef.current;
  if (
    previousPresentation !== presentation &&
    previousPresentation.value === presentation.value &&
    inputDuringRender
  ) {
    const start =
      inputDuringRender.selectionStart ?? previousPresentation.displayValue.length;
    const end = inputDuringRender.selectionEnd ?? start;
    pendingLogicalSelectionRef.current = [
      logicalCaretFromDisplayOffset(previousPresentation.mapping, start),
      logicalCaretFromDisplayOffset(previousPresentation.mapping, end),
    ];
  }
  previousPresentationRef.current = presentation;
  const countryTransitionLedgerRef = useRef<CountryTransitionLedger>({
    initialized: false,
    numberingPlan: resolveNumberingPlan(undefined, { metadata }),
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

  const commitExtension = useCallback(
    (nextExtension: PhoneExtension, reason: PhoneExtensionChangeReason) => {
      const previousExtension = currentExtensionRef.current;
      if (nextExtension === previousExtension) {
        return;
      }

      if (!extensionControlledRef.current) {
        currentExtensionRef.current = nextExtension;
        setUncontrolledExtension(nextExtension);
      }
      onExtensionChange?.(nextExtension, {
        extension: nextExtension,
        previousExtension,
        reason,
      });
    },
    [
      currentExtensionRef,
      extensionControlledRef,
      onExtensionChange,
      setUncontrolledExtension,
    ],
  );

  const scheduleExtensionReconciliation = useCallback(() => {
    const lifecycleGeneration = lifecycleGenerationRef.current;
    queueMicrotask(() => {
      if (
        !lifecycleActiveRef.current ||
        lifecycleGenerationRef.current !== lifecycleGeneration
      ) {
        return;
      }

      const input = extensionInputElementRef.current;
      const displayValue = extensionControlledRef.current
        ? (renderedExtensionRef.current ?? '')
        : (currentExtensionRef.current ?? '');
      if (extensionControlledRef.current) {
        currentExtensionRef.current = renderedExtensionRef.current;
      }
      if (input && input.value !== displayValue) {
        input.value = displayValue;
      }
    });
  }, [currentExtensionRef, extensionControlledRef]);

  const reset = useCallback(() => {
    resetValidationVisibility();
    pendingNationalInputRef.current = null;
    const previousValue = currentValueRef.current;
    const previousExtension = currentExtensionRef.current;
    const previousSelectedCountry = currentSelectedCountryRef.current;
    const nextValue = controlledRef.current
      ? previousValue
      : initialDefaultValueRef.current;
    const nextSelectedCountry = countryControlledRef.current
      ? previousSelectedCountry
      : initialDefaultCountryRef.current;
    const nextExtension = extensionControlledRef.current
      ? previousExtension
      : initialDefaultExtensionRef.current;

    if (!controlledRef.current) {
      currentValueRef.current = nextValue;
      setUncontrolledValue(nextValue);
    }
    if (!countryControlledRef.current) {
      currentSelectedCountryRef.current = nextSelectedCountry;
      setUncontrolledCountry(nextSelectedCountry);
    }
    if (!extensionControlledRef.current) {
      currentExtensionRef.current = nextExtension;
      setUncontrolledExtension(nextExtension);
    }
    emitCountryTransition(
      resolvePlanForCountry(previousValue, previousSelectedCountry, metadata),
      resolvePlanForCountry(nextValue, nextSelectedCountry, metadata),
      previousValue,
      nextValue,
      'reset',
    );
  }, [
    controlledRef,
    countryControlledRef,
    currentExtensionRef,
    currentSelectedCountryRef,
    currentValueRef,
    emitCountryTransition,
    extensionControlledRef,
    initialDefaultCountryRef,
    initialDefaultExtensionRef,
    initialDefaultValueRef,
    metadata,
    resetValidationVisibility,
    setUncontrolledCountry,
    setUncontrolledExtension,
    setUncontrolledValue,
  ]);

  const setExtensionInputRef = useCallback<RefCallback<HTMLInputElement>>((input) => {
    extensionInputElementRef.current = input;
  }, []);

  const handleExtensionInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      let nextExtension: PhoneExtension;
      try {
        nextExtension = parsePhoneExtension(event.currentTarget.value, {
          ...(extensionMaxLength === undefined
            ? {}
            : { maxLength: extensionMaxLength }),
        });
      } catch {
        scheduleExtensionReconciliation();
        return;
      }

      commitExtension(nextExtension, nextExtension === undefined ? 'clear' : 'input');
      scheduleExtensionReconciliation();
    },
    [commitExtension, extensionMaxLength, scheduleExtensionReconciliation],
  );

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
      const nextValue = parsePhoneInputPresentation(displayValue, {
        country: inputContext.country ?? null,
        displayMode: inputContext.displayMode,
        metadata,
      });
      const previousValue = currentValueRef.current;
      const valueChanged = nextValue !== previousValue;
      const previousNumberingPlan = resolvePlanForCountry(
        previousValue,
        previousSelectedCountry,
        metadata,
      );
      const nextNumberingPlan = resolvePlanForCountry(
        nextValue,
        nextSelectedCountry,
        metadata,
      );
      const nextValidationOptions: PhoneValidationOptions = {
        metadata,
        required,
        validationMode,
        ...(nextSelectedCountry == null
          ? {}
          : { selectedCountry: nextSelectedCountry }),
        ...(allowedNumberTypes === undefined ? {} : { allowedNumberTypes }),
      };

      if (valueChanged) {
        if (!controlledRef.current) {
          currentValueRef.current = nextValue;
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
      inputContext.country,
      inputContext.displayMode,
      metadata,
      onChange,
      required,
      setUncontrolledValue,
      validationMode,
    ],
  );

  const commitImportedValue = useCallback(
    (nextValue: Exclude<PhoneValue, undefined>, nextExtension: PhoneExtension) => {
      const previousExtension = currentExtensionRef.current;
      const extensionChanged = nextExtension !== previousExtension;

      if (extensionChanged && !extensionControlledRef.current) {
        currentExtensionRef.current = nextExtension;
        setUncontrolledExtension(nextExtension);
      }

      commit(nextValue, 'paste');

      if (extensionChanged) {
        onExtensionChange?.(nextExtension, {
          extension: nextExtension,
          previousExtension,
          reason: 'paste',
        });
      }
      scheduleExtensionReconciliation();
    },
    [
      commit,
      currentExtensionRef,
      extensionControlledRef,
      onExtensionChange,
      scheduleExtensionReconciliation,
      setUncontrolledExtension,
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

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      if (event.defaultPrevented) {
        return;
      }

      const clipboardText = event.clipboardData.getData('text/plain').trim();
      const isRfc3966 = /^tel:/iu.test(clipboardText);
      const parsedImport = isRfc3966
        ? parseRfc3966(clipboardText)
        : parsePhoneExtensionBearingText(
            clipboardText,
            numberingPlan.selectedCountry ?? undefined,
          );
      if (
        isRfc3966 ||
        parsedImport !== null ||
        hasPhoneExtensionSyntax(clipboardText)
      ) {
        event.preventDefault();
        if (!parsedImport) {
          return;
        }

        pendingNationalInputRef.current = null;
        pendingBeforeInputRef.current = null;
        pasteTransactionRef.current = false;
        if (pasteResetFrameRef.current !== undefined) {
          window.cancelAnimationFrame(pasteResetFrameRef.current);
          pasteResetFrameRef.current = undefined;
        }
        const logicalEnd = parsedImport.value.length - 1;
        pendingLogicalSelectionRef.current = [logicalEnd, logicalEnd];
        const importedExtension =
          parsedImport.extension === undefined
            ? undefined
            : parsePhoneExtension(parsedImport.extension, {
                ...(extensionMaxLength === undefined
                  ? {}
                  : { maxLength: extensionMaxLength }),
              });
        commitImportedValue(parsedImport.value, importedExtension);
        return;
      }

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
    },
    [commitImportedValue, extensionMaxLength, numberingPlan.selectedCountry],
  );

  const handleInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const inputEvent = resolveInputEventMetadata(event.nativeEvent);
      const capturedInput = capturedInputRef.current;
      capturedInputRef.current = null;
      const pendingBeforeInput = pendingBeforeInputRef.current;
      pendingBeforeInputRef.current = null;

      if (composingRef.current || inputEvent.isComposing) {
        return;
      }

      const pendingCompositionCommit = pendingCompositionCommitRef.current;
      const completesComposition =
        pendingCompositionCommit !== null &&
        (inputEvent.inputType === 'insertCompositionText' ||
          inputEvent.data === pendingCompositionCommit.data);
      if (completesComposition) {
        pendingCompositionCommitRef.current = null;
      }

      const selectedCountry = currentSelectedCountryRef.current;
      const previousDisplayValue = presentation.displayValue;
      const observedDisplayValue =
        capturedInput?.displayValue ?? event.currentTarget.value;
      const normalizedDisplayValue =
        normalizeObservedDisplayValue(observedDisplayValue);
      const selectionStart =
        capturedInput?.selection[0] ?? event.currentTarget.selectionStart;
      const selectionEnd =
        capturedInput?.selection[1] ?? event.currentTarget.selectionEnd;
      const appendsAtEnd =
        selectionStart === observedDisplayValue.length &&
        selectionEnd === observedDisplayValue.length;
      const inputType = inputEvent.inputType || pendingBeforeInput?.inputType || '';
      const inputData = inputEvent.data ?? pendingBeforeInput?.data ?? null;
      const inferredFullReplacement =
        pendingBeforeInput === null &&
        inputType === 'insertReplacementText' &&
        inputData !== null &&
        inputData === observedDisplayValue
          ? {
              data: inputData,
              displayValue: previousDisplayValue,
              inputType,
              selection: [0, previousDisplayValue.length] as const,
            }
          : null;
      const inferredIncrementalInput =
        pendingBeforeInput === null &&
        inferredFullReplacement === null &&
        inputData !== null &&
        appendsAtEnd
          ? {
              data: inputData,
              displayValue: previousDisplayValue,
              inputType: inputType || 'insertText',
              selection: [
                previousDisplayValue.length,
                previousDisplayValue.length,
              ] as const,
            }
          : null;
      const inputEvidence = pendingBeforeInput
        ? {
            ...pendingBeforeInput,
            data: inputData,
            inputType,
          }
        : (inferredFullReplacement ?? inferredIncrementalInput);
      const pasted = pasteTransactionRef.current;
      const transactionSource = resolveInputTransactionSource({
        displayLength:
          inputEvidence?.displayValue.length ?? previousDisplayValue.length,
        inputType,
        isComposing: false,
        pasted,
        selection: inputEvidence?.selection ?? [
          previousDisplayValue.length,
          previousDisplayValue.length,
        ],
      });
      const committedSource =
        completesComposition && pendingCompositionCommit
          ? pendingCompositionCommit.source
          : transactionSource;
      if (committedSource === 'history-undo' || committedSource === 'history-redo') {
        pendingNationalInputRef.current = null;
      }
      if (
        rejectsInvalidNationalReplacement(
          inputEvidence,
          committedSource,
          selectedCountry,
          metadata,
        )
      ) {
        pendingNationalInputRef.current = null;
        pasteTransactionRef.current = false;
        if (pasteResetFrameRef.current !== undefined) {
          window.cancelAnimationFrame(pasteResetFrameRef.current);
          pasteResetFrameRef.current = undefined;
        }
        engineBridge.reconcileExternal(
          {
            displayValue: presentation.displayValue,
            selection: [
              presentation.displayValue.length,
              presentation.displayValue.length,
            ],
          },
          inputContext,
        );
        return;
      }
      const nationalInput = resolveCompleteNationalInput(
        normalizedDisplayValue,
        inputEvidence,
        committedSource,
        selectedCountry,
        pendingNationalInputRef.current,
        metadata,
      );
      const displayValue = nationalInput.value ?? normalizedDisplayValue;
      const nextValue = parsePhoneInputPresentation(displayValue, {
        country: inputContext.country ?? null,
        displayMode: inputContext.displayMode,
        metadata,
      });
      if (
        inputContext.displayMode === 'international-fixed-calling-code' &&
        inputContext.country &&
        nextValue !== undefined &&
        !nextValue
          .slice(1)
          .startsWith(getCountryCallingCode(inputContext.country, metadata))
      ) {
        pasteTransactionRef.current = false;
        if (pasteResetFrameRef.current !== undefined) {
          window.cancelAnimationFrame(pasteResetFrameRef.current);
          pasteResetFrameRef.current = undefined;
        }
        const protectedEnd =
          presentation.mapping.logicalToDisplay[
            getCountryCallingCode(inputContext.country, metadata).length
          ] ?? presentation.displayValue.length;
        engineBridge.reconcileExternal(
          {
            displayValue: presentation.displayValue,
            selection: [protectedEnd, protectedEnd],
          },
          inputContext,
        );
        return;
      }
      pasteTransactionRef.current = false;
      if (pasteResetFrameRef.current !== undefined) {
        window.cancelAnimationFrame(pasteResetFrameRef.current);
        pasteResetFrameRef.current = undefined;
      }
      const nextPresentation = formatPhoneInputPresentation(nextValue, {
        country: inputContext.country ?? null,
        displayMode: inputContext.displayMode,
        locale: inputContext.locale,
        metadata,
        ...(inputContext.displayMask === undefined
          ? {}
          : { displayMask: inputContext.displayMask }),
        ...(inputContext.formatStrategy === undefined
          ? {}
          : { formatStrategy: inputContext.formatStrategy }),
      });
      pendingNationalInputRef.current = nationalInput.pending
        ? {
            ...nationalInput.pending,
            displayValue: nextPresentation.displayValue,
          }
        : null;
      if (capturedInput) {
        const authoritativeNationalEnd =
          nationalInput.value !== null && nextValue ? nextValue.length - 1 : null;
        pendingLogicalSelectionRef.current = authoritativeNationalEnd
          ? [authoritativeNationalEnd, authoritativeNationalEnd]
          : [
              resolveObservedLogicalPosition(
                observedDisplayValue,
                capturedInput.selection[0],
                nextValue,
                inputContext.country,
                inputContext.displayMode,
                metadata,
              ),
              resolveObservedLogicalPosition(
                observedDisplayValue,
                capturedInput.selection[1],
                nextValue,
                inputContext.country,
                inputContext.displayMode,
                metadata,
              ),
            ];
      } else if (nextPresentation.displayValue === event.currentTarget.value) {
        const start =
          event.currentTarget.selectionStart ?? nextPresentation.displayValue.length;
        const end = event.currentTarget.selectionEnd ?? start;
        pendingLogicalSelectionRef.current = [
          logicalCaretFromDisplayOffset(nextPresentation.mapping, start),
          logicalCaretFromDisplayOffset(nextPresentation.mapping, end),
        ];
      }
      scheduleCommit(
        displayValue,
        resolveChangeReason(committedSource, nextValue),
        nationalInput.value !== null,
        nationalInput.value === null ? null : selectedCountry,
      );
    },
    [
      currentSelectedCountryRef,
      engineBridge,
      inputContext,
      metadata,
      presentation.displayValue,
      presentation.mapping.logicalToDisplay,
      scheduleCommit,
    ],
  );

  const handleInputCapture = useCallback((event: FormEvent<HTMLInputElement>) => {
    const inputEvent = resolveInputEventMetadata(event.nativeEvent);

    if (composingRef.current || inputEvent.isComposing) {
      compositionTextRef.current = event.currentTarget.value;
      compositionDigitOffsetRef.current = countDigitsBeforeOffset(
        event.currentTarget.value,
        event.currentTarget.selectionStart ?? event.currentTarget.value.length,
      );
      return;
    }

    capturedInputRef.current = {
      displayValue: event.currentTarget.value,
      selection: [
        event.currentTarget.selectionStart ?? event.currentTarget.value.length,
        event.currentTarget.selectionEnd ?? event.currentTarget.value.length,
      ],
    };
  }, []);

  const handleCompositionStart = useCallback(() => {
    pendingCommitScheduledRef.current = false;
    pendingBeforeInputRef.current = null;
    pendingTransactionRef.current = null;
    pendingCompositionCommitRef.current = null;
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
      const compositionSource =
        compositionTextRef.current === null &&
        [...event.data].length === 1 &&
        normalizePhoneInputDigit(event.data) !== undefined
          ? 'insert'
          : 'composition';
      if (compositionSource === 'composition') {
        pendingNationalInputRef.current = null;
      }
      const compositionSelection =
        digitOffset === null
          ? null
          : {
              canonicalValue: parsePhoneInputPresentation(
                normalizeObservedDisplayValue(displayValue),
                {
                  country: inputContext.country ?? null,
                  displayMode: inputContext.displayMode,
                  metadata,
                },
              ),
              digitOffset,
            };
      const pendingCompositionCommit: PendingCompositionCommit = {
        data: event.data,
        displayValue,
        selection: compositionSelection,
        source: compositionSource,
      };
      pendingCompositionCommitRef.current = pendingCompositionCommit;
      const lifecycleGeneration = lifecycleGenerationRef.current;
      queueMicrotask(() => {
        if (
          !lifecycleActiveRef.current ||
          lifecycleGenerationRef.current !== lifecycleGeneration ||
          pendingCompositionCommitRef.current !== pendingCompositionCommit
        ) {
          return;
        }

        pendingCompositionCommitRef.current = null;
        setPendingCompositionSelection(pendingCompositionCommit.selection);
        const normalizedDisplayValue = normalizeObservedDisplayValue(displayValue);
        const selectedCountry = currentSelectedCountryRef.current;
        const nationalValue =
          compositionSource === 'insert' &&
          selectedCountry &&
          !normalizedDisplayValue.includes('+')
            ? parseNationalPhoneValue(displayValue, selectedCountry, { metadata })
            : null;
        commit(
          nationalValue ?? normalizedDisplayValue,
          compositionSource === 'insert' ? 'input' : 'composition',
          selectedCountry,
          selectedCountry,
          nationalValue !== null,
        );
      });
      compositionTextRef.current = null;
      compositionDigitOffsetRef.current = null;
    },
    [
      commit,
      currentSelectedCountryRef,
      inputContext.country,
      inputContext.displayMode,
      metadata,
    ],
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
    const displayValue = presentation.displayValue;
    const reconcilesCompositionSelection =
      pendingCompositionSelection?.canonicalValue === currentValue;
    let selection: readonly [number, number];
    const pendingLogicalSelection = pendingLogicalSelectionRef.current;
    if (pendingLogicalSelection) {
      const maxLogical = presentation.mapping.logicalToDisplay.length - 1;
      selection = [
        presentation.mapping.logicalToDisplay[
          Math.min(pendingLogicalSelection[0], maxLogical)
        ] ?? displayValue.length,
        presentation.mapping.logicalToDisplay[
          Math.min(pendingLogicalSelection[1], maxLogical)
        ] ?? displayValue.length,
      ];
      pendingLogicalSelectionRef.current = null;
    } else if (reconcilesCompositionSelection && pendingCompositionSelection) {
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
  }, [
    currentValue,
    engineBridge,
    inputContext,
    pendingCompositionSelection,
    presentation,
  ]);

  useEffect(() => {
    lifecycleActiveRef.current = true;

    return () => {
      lifecycleActiveRef.current = false;
      lifecycleGenerationRef.current += 1;
      formCleanupRef.current?.();
      beforeInputCleanupRef.current?.();
      engineCleanupRef.current?.();
      capturedInputRef.current = null;
      pendingBeforeInputRef.current = null;
      pendingNationalInputRef.current = null;
      pendingTransactionRef.current = null;
      pendingLogicalSelectionRef.current = null;
      pendingCommitScheduledRef.current = false;
      composingRef.current = false;
      compositionTextRef.current = null;
      compositionDigitOffsetRef.current = null;
      pendingCompositionCommitRef.current = null;
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
      assertPhoneCountry(country, 'selected', metadata);
      pendingNationalInputRef.current = null;
      const previousCountry = currentSelectedCountryRef.current;
      const previousValue = currentValueRef.current;
      const input = inputElementRef.current;
      if (input?.matches(':focus')) {
        const start = input.selectionStart ?? presentation.displayValue.length;
        const end = input.selectionEnd ?? start;
        pendingLogicalSelectionRef.current = [
          logicalCaretFromDisplayOffset(presentation.mapping, start),
          logicalCaretFromDisplayOffset(presentation.mapping, end),
        ];
      }
      const selection = resolvePhoneCountrySelection(previousValue, country, {
        metadata,
      });

      if (!countryControlledRef.current) {
        currentSelectedCountryRef.current = country;
        setUncontrolledCountry(country);
      }

      commit(selection.value, 'country-selection', country, previousCountry, true);
      onCountrySelection?.(selection);
      return selection;
    },
    [
      commit,
      countryControlledRef,
      currentSelectedCountryRef,
      currentValueRef,
      metadata,
      onCountrySelection,
      presentation,
      setUncontrolledCountry,
    ],
  );

  return {
    clear,
    extensionInputElementRef,
    focus,
    handleCompositionEnd,
    handleCompositionStart,
    handleInput,
    handleInputCapture,
    handleExtensionInput,
    handlePaste,
    inputElementRef,
    reset,
    selectCountry,
    setExtensionInputRef,
    setInputRef,
  };
}
