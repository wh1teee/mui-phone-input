import type { CountryCode } from 'libphonenumber-js/max';

import type {
  DisplayMask,
  FormatStrategy,
  PhoneInputDisplayMode,
} from '../phone-formatting';

export const INPUT_TRANSACTION_ENGINE_CONTRACT_VERSION = 1 as const;
export const SELECTED_INPUT_TRANSACTION_ENGINE = 'maskito' as const;

export type InputSelection = readonly [start: number, end: number];

export type InputTransactionSource =
  | 'insert'
  | 'delete-backward'
  | 'delete-forward'
  | 'range-replacement'
  | 'paste'
  | 'autofill'
  | 'predictive-replacement'
  | 'composition'
  | 'history-undo'
  | 'history-redo';

export type InputTransactionSnapshot = Readonly<{
  displayValue: string;
  selection: InputSelection;
}>;

export type CommittedInputTransaction = Readonly<{
  after: InputTransactionSnapshot;
  before: InputTransactionSnapshot;
  inputType: string;
  source: InputTransactionSource;
}>;

export type InputTransactionSourceEvidence = Readonly<{
  displayLength: number;
  inputType: string;
  isComposing: boolean;
  pasted: boolean;
  selection: InputSelection;
}>;

export function resolveInputTransactionSource(
  evidence: InputTransactionSourceEvidence,
): InputTransactionSource {
  const { displayLength, inputType, isComposing, pasted, selection } = evidence;
  const [selectionStart, selectionEnd] = selection;

  if (
    !Number.isSafeInteger(displayLength) ||
    displayLength < 0 ||
    selectionStart < 0 ||
    selectionEnd < selectionStart ||
    selectionEnd > displayLength
  ) {
    throw new RangeError('Input transaction selection is outside the display value.');
  }

  if (isComposing) {
    return 'composition';
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
  if (inputType === 'deleteContentBackward') {
    return 'delete-backward';
  }
  if (inputType === 'deleteContentForward') {
    return 'delete-forward';
  }
  if (inputType === 'insertReplacementText') {
    return selectionStart === 0 && selectionEnd === displayLength
      ? 'autofill'
      : 'predictive-replacement';
  }
  if (selectionStart !== selectionEnd) {
    return 'range-replacement';
  }
  return 'insert';
}

export type InputEngineContext = Readonly<{
  country?: CountryCode;
  displayMask?: DisplayMask;
  displayMode: PhoneInputDisplayMode;
  fixedCallingCode: boolean;
  formatStrategy?: FormatStrategy;
  formatStrategyKey: string;
  locale: string;
}>;

export interface InputTransactionEngineBridge {
  attach(input: HTMLInputElement): () => void;
  reconcileExternal(
    snapshot: InputTransactionSnapshot,
    context: InputEngineContext,
  ): void;
  updateContext(context: InputEngineContext): void;
}
