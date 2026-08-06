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
