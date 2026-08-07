import fc from 'fast-check';
import type { CountryCode } from 'libphonenumber-js/max';
import { describe, expect, it } from 'vitest';

import {
  type InputSelection,
  type InputTransactionSource,
  resolveInputTransactionSource,
} from '../../packages/mui-phone-input/src/internal/input-transaction-engine';
import {
  formatPhoneInputPresentation,
  parsePhoneInputPresentation,
} from '../../packages/mui-phone-input/src/phone-formatting';
import {
  isPhoneValue,
  parsePhoneValue,
  type PhoneValue,
} from '../../packages/mui-phone-input/src/phone-value';
import type { InputTransactionCommand } from '../model/input-transaction-model';

const collapsed = (offset: number): InputSelection => [offset, offset];

const digitCharacterArbitrary = fc.constantFrom(
  '0',
  '1',
  '٢',
  '٣',
  '۴',
  '۵',
  '६',
  '७',
  '８',
  '９',
);
const digitTextArbitrary = fc
  .array(digitCharacterArbitrary, { maxLength: 5 })
  .map((characters) => characters.join(''));
const formattedTextArbitrary = fc
  .array(digitCharacterArbitrary, { maxLength: 5 })
  .map((characters) => characters.join(' - '));
const canonicalValueArbitrary: fc.Arbitrary<PhoneValue> = fc.oneof(
  fc.constant(undefined),
  fc
    .array(fc.integer({ min: 0, max: 9 }), { minLength: 1, maxLength: 15 })
    .map((digits) => `+${digits.join('')}` as `+${string}`),
);
const commandArbitrary: fc.Arbitrary<InputTransactionCommand> = fc.oneof(
  digitTextArbitrary.map((text) => ({ kind: 'insert' as const, text })),
  fc.constant({ kind: 'backspace' as const }),
  fc.constant({ kind: 'delete' as const }),
  digitTextArbitrary.map((text) => ({ kind: 'replace-range' as const, text })),
  formattedTextArbitrary.map((text) => ({ kind: 'paste' as const, text })),
  formattedTextArbitrary.map((text) => ({ kind: 'autofill' as const, text })),
  digitTextArbitrary.map((text) => ({ kind: 'composition' as const, text })),
  canonicalValueArbitrary.map((value) => ({ kind: 'external-update' as const, value })),
  fc
    .constantFrom<CountryCode | undefined>('US', 'BY', undefined)
    .map((country) => ({ kind: 'change-country' as const, country })),
  fc
    .constantFrom('en', 'fr')
    .map((locale) => ({ kind: 'change-locale' as const, locale })),
  fc
    .constantFrom('automatic', 'masked')
    .map((strategy) => ({ kind: 'change-mask' as const, strategy })),
  fc.constant({ kind: 'undo' as const }),
  fc.constant({ kind: 'redo' as const }),
  canonicalValueArbitrary.map((value) => ({ kind: 'reset' as const, value })),
);

type SequenceState = {
  callbacks: number;
  country: CountryCode | undefined;
  history: PhoneValue[];
  locale: string;
  masked: boolean;
  redo: PhoneValue[];
  selection: InputSelection;
  value: PhoneValue;
};

function digitsOf(value: PhoneValue): string {
  return value?.slice(1) ?? '';
}

function digitsFromText(text: string): string {
  return parsePhoneValue(text)?.slice(1) ?? '';
}

function valueFromDigits(digits: string): PhoneValue {
  const bounded = digits.slice(0, 15);
  return bounded.length === 0 ? undefined : (`+${bounded}` as const);
}

function boundedSelection(selection: InputSelection, length: number): InputSelection {
  const start = Math.min(selection[0], length);
  const end = Math.max(start, Math.min(selection[1], length));
  return [start, end];
}

function replacementSelection(length: number): InputSelection {
  if (length === 0) {
    return [0, 0];
  }
  const start = Math.floor(length / 3);
  const end = Math.max(start + 1, Math.ceil((length * 2) / 3));
  return [start, Math.min(end, length)];
}

function replaceDigits(
  value: PhoneValue,
  selection: InputSelection,
  insertedDigits: string,
): Readonly<{ selection: InputSelection; value: PhoneValue }> {
  const digits = digitsOf(value);
  const [start, end] = boundedSelection(selection, digits.length);
  const nextDigits =
    `${digits.slice(0, start)}${insertedDigits}${digits.slice(end)}`.slice(0, 15);
  const nextOffset = Math.min(start + insertedDigits.length, nextDigits.length);
  return {
    selection: [nextOffset, nextOffset],
    value: valueFromDigits(nextDigits),
  };
}

function classify(
  inputType: string,
  selection: InputSelection,
  displayLength: number,
  options: Readonly<{ isComposing?: boolean; pasted?: boolean }> = {},
): InputTransactionSource {
  return resolveInputTransactionSource({
    displayLength,
    inputType,
    isComposing: options.isComposing ?? false,
    pasted: options.pasted ?? false,
    selection: boundedSelection(selection, displayLength),
  });
}

function commitUserValue(
  state: SequenceState,
  nextValue: PhoneValue,
  nextSelection: InputSelection,
): void {
  if (nextValue !== state.value) {
    state.history.push(state.value);
    state.redo = [];
    state.value = nextValue;
    state.callbacks += 1;
  }
  state.selection = boundedSelection(nextSelection, digitsOf(state.value).length);
}

function assertSequenceInvariants(state: SequenceState): void {
  expect(isPhoneValue(state.value)).toBe(true);
  if (state.value !== undefined) {
    expect(state.value).toMatch(/^\+\d{1,15}$/u);
  }

  const presentation = formatPhoneInputPresentation(state.value, {
    country: state.country ?? null,
    displayMode: 'international',
    locale: state.locale,
    ...(state.masked ? { displayMask: { pattern: '+### ### ### ### ###' } } : {}),
  });
  expect(
    parsePhoneInputPresentation(presentation.displayValue, {
      country: state.country ?? null,
      displayMode: 'international',
    }),
  ).toBe(state.value);

  const logicalSelection = boundedSelection(
    state.selection,
    digitsOf(state.value).length,
  );
  for (const logicalOffset of logicalSelection) {
    const displayOffset =
      presentation.mapping.logicalToDisplay[
        Math.min(logicalOffset, presentation.mapping.logicalToDisplay.length - 1)
      ] ?? presentation.displayValue.length;
    expect(displayOffset).toBeGreaterThanOrEqual(0);
    expect(displayOffset).toBeLessThanOrEqual(presentation.displayValue.length);
  }
}

function applyCommand(state: SequenceState, command: InputTransactionCommand): void {
  const beforeCallbacks = state.callbacks;
  const beforeDigits = digitsOf(state.value);
  const currentSelection = boundedSelection(state.selection, beforeDigits.length);
  let userTransaction = false;

  switch (command.kind) {
    case 'insert': {
      userTransaction = true;
      const source = classify('insertText', currentSelection, beforeDigits.length);
      expect(source).toBe(
        currentSelection[0] === currentSelection[1] ? 'insert' : 'range-replacement',
      );
      const next = replaceDigits(
        state.value,
        currentSelection,
        digitsFromText(command.text),
      );
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'backspace': {
      userTransaction = true;
      expect(
        classify('deleteContentBackward', currentSelection, beforeDigits.length),
      ).toBe('delete-backward');
      const selection =
        currentSelection[0] === currentSelection[1] && currentSelection[0] > 0
          ? ([currentSelection[0] - 1, currentSelection[0]] as const)
          : currentSelection;
      const next = replaceDigits(state.value, selection, '');
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'delete': {
      userTransaction = true;
      expect(
        classify('deleteContentForward', currentSelection, beforeDigits.length),
      ).toBe('delete-forward');
      const selection =
        currentSelection[0] === currentSelection[1] &&
        currentSelection[0] < beforeDigits.length
          ? ([currentSelection[0], currentSelection[0] + 1] as const)
          : currentSelection;
      const next = replaceDigits(state.value, selection, '');
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'replace-range': {
      userTransaction = true;
      const selection = replacementSelection(beforeDigits.length);
      const source = classify('insertText', selection, beforeDigits.length);
      expect(source).toBe(
        selection[0] === selection[1] ? 'insert' : 'range-replacement',
      );
      const next = replaceDigits(state.value, selection, digitsFromText(command.text));
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'paste': {
      userTransaction = true;
      expect(
        classify('insertFromPaste', currentSelection, beforeDigits.length, {
          pasted: true,
        }),
      ).toBe('paste');
      const next = replaceDigits(
        state.value,
        currentSelection,
        digitsFromText(command.text),
      );
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'autofill': {
      userTransaction = true;
      const selection: InputSelection = [0, beforeDigits.length];
      expect(classify('insertReplacementText', selection, beforeDigits.length)).toBe(
        'autofill',
      );
      const next = replaceDigits(state.value, selection, digitsFromText(command.text));
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'composition': {
      userTransaction = true;
      expect(
        classify('insertCompositionText', currentSelection, beforeDigits.length, {
          isComposing: true,
        }),
      ).toBe('composition');
      const next = replaceDigits(
        state.value,
        currentSelection,
        digitsFromText(command.text),
      );
      commitUserValue(state, next.value, next.selection);
      break;
    }
    case 'external-update': {
      state.value = command.value;
      state.selection = collapsed(digitsOf(state.value).length);
      break;
    }
    case 'change-country': {
      state.country =
        command.country === 'US' || command.country === 'BY'
          ? command.country
          : undefined;
      break;
    }
    case 'change-locale': {
      state.locale = command.locale;
      break;
    }
    case 'change-mask': {
      state.masked = command.strategy === 'masked';
      break;
    }
    case 'undo': {
      userTransaction = true;
      expect(classify('historyUndo', currentSelection, beforeDigits.length)).toBe(
        'history-undo',
      );
      if (state.history.length > 0) {
        const previous = state.history[state.history.length - 1];
        state.history.length -= 1;
        state.redo.push(state.value);
        state.value = previous;
        state.callbacks += 1;
      }
      state.selection = collapsed(digitsOf(state.value).length);
      break;
    }
    case 'redo': {
      userTransaction = true;
      expect(classify('historyRedo', currentSelection, beforeDigits.length)).toBe(
        'history-redo',
      );
      if (state.redo.length > 0) {
        const next = state.redo[state.redo.length - 1];
        state.redo.length -= 1;
        state.history.push(state.value);
        state.value = next;
        state.callbacks += 1;
      }
      state.selection = collapsed(digitsOf(state.value).length);
      break;
    }
    case 'reset': {
      state.value = command.value;
      state.history = [];
      state.redo = [];
      state.selection = collapsed(digitsOf(state.value).length);
      break;
    }
  }

  const callbackDelta = state.callbacks - beforeCallbacks;
  expect(callbackDelta).toBeGreaterThanOrEqual(0);
  expect(callbackDelta).toBeLessThanOrEqual(userTransaction ? 1 : 0);
  assertSequenceInvariants(state);
}

describe('input transaction model', () => {
  it.each([
    ['insertText', false, collapsed(3), 8, 'insert'],
    ['insertCompositionText', false, collapsed(3), 8, 'insert'],
    ['insertText', false, [2, 5] as const, 8, 'range-replacement'],
    ['insertCompositionText', false, [2, 5] as const, 8, 'range-replacement'],
    ['insertFromPaste', false, collapsed(3), 8, 'paste'],
    ['insertReplacementText', false, [0, 8] as const, 8, 'autofill'],
    ['insertReplacementText', false, [2, 5] as const, 8, 'predictive-replacement'],
    ['deleteContentBackward', false, collapsed(3), 8, 'delete-backward'],
    ['deleteContentForward', false, collapsed(3), 8, 'delete-forward'],
    ['historyUndo', false, collapsed(3), 8, 'history-undo'],
    ['historyRedo', false, collapsed(3), 8, 'history-redo'],
    ['insertCompositionText', true, collapsed(3), 8, 'composition'],
  ] as const)(
    'classifies %s with composing=%s as %s',
    (inputType, isComposing, selection, displayLength, expected) => {
      expect(
        resolveInputTransactionSource({
          displayLength,
          inputType,
          isComposing,
          pasted: false,
          selection,
        }),
      ).toBe(expected);
    },
  );

  it('treats a non-composing Firefox insertCompositionText as normal text insertion', () => {
    expect(
      resolveInputTransactionSource({
        displayLength: 0,
        inputType: 'insertCompositionText',
        isComposing: false,
        pasted: false,
        selection: [0, 0],
      }),
    ).toBe('insert');
  });

  it('preserves transaction classification invariants across generated sequences', () => {
    const inputTypes = [
      '',
      'insertText',
      'insertCompositionText',
      'insertReplacementText',
      'insertFromPaste',
      'deleteContentBackward',
      'deleteContentForward',
      'historyUndo',
      'historyRedo',
    ] as const;
    let generatedCases = 0;

    for (let displayLength = 0; displayLength <= 12; displayLength += 1) {
      for (let start = 0; start <= displayLength; start += 1) {
        for (let end = start; end <= displayLength; end += 1) {
          for (const inputType of inputTypes) {
            for (const isComposing of [false, true]) {
              const selection = [start, end] as const;
              const source = resolveInputTransactionSource({
                displayLength,
                inputType,
                isComposing,
                pasted: false,
                selection,
              });

              expect(source).toMatch(
                /^(?:autofill|composition|delete-backward|delete-forward|history-redo|history-undo|insert|paste|predictive-replacement|range-replacement)$/u,
              );
              if (!isComposing && inputType === 'insertCompositionText') {
                expect(source).toBe(start === end ? 'insert' : 'range-replacement');
              }
              if (
                inputType === 'insertReplacementText' &&
                start === 0 &&
                end === displayLength
              ) {
                expect(source).toBe(isComposing ? 'composition' : 'autofill');
              }
              generatedCases += 1;
            }
          }
        }
      }
    }

    expect(generatedCases).toBe(8_190);
  });

  it('executes generated model-based transaction sequences while preserving invariants', () => {
    let executedCommands = 0;

    fc.assert(
      fc.property(
        fc.array(commandArbitrary, { minLength: 50, maxLength: 50 }),
        (commands) => {
          const state: SequenceState = {
            callbacks: 0,
            country: undefined,
            history: [],
            locale: 'en',
            masked: false,
            redo: [],
            selection: [0, 0],
            value: undefined,
          };

          assertSequenceInvariants(state);
          for (const command of commands) {
            applyCommand(state, command);
            executedCommands += 1;
          }
        },
      ),
      { numRuns: 200, seed: 0x4d_50_49 },
    );

    expect(executedCommands).toBe(10_000);
  });
});
