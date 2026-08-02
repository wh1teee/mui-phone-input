import type {
  MaskitoOptions,
  MaskitoPostprocessor,
  MaskitoPreprocessor,
} from '@maskito/core';

import { normalizePhoneInputDigit, normalizePhoneInputText } from '../phone-value';

type ElementState = Parameters<MaskitoPreprocessor>[0]['elementState'];

const E164_CANDIDATE_MASK = /^\+?\d*$/u;

function countDigits(value: string): number {
  let count = 0;

  for (const character of value) {
    if (normalizePhoneInputDigit(character) !== undefined) {
      count += 1;
    }
  }

  return count;
}

function mapSelectionPosition(
  value: string,
  position: number,
  nextValue: string,
): number {
  if (nextValue.length === 0) {
    return 0;
  }

  if (position === 0 && value.startsWith('+')) {
    return 0;
  }

  return Math.min(nextValue.length, 1 + countDigits(value.slice(0, position)));
}

function normalizeElementState({ selection, value }: ElementState): ElementState {
  const nextValue = normalizePhoneInputText(value);

  return {
    selection: [
      mapSelectionPosition(value, selection[0], nextValue),
      mapSelectionPosition(value, selection[1], nextValue),
    ],
    value: nextValue,
  };
}

function normalizeInsertedData(
  data: string,
  { selection, value }: ElementState,
): string {
  const digits = [...data]
    .map((character) => normalizePhoneInputDigit(character))
    .filter((digit): digit is string => digit !== undefined)
    .join('');
  const [from, to] = selection;
  const valueOutsideSelection = `${value.slice(0, from)}${value.slice(to)}`;
  const canInsertPlus =
    data.includes('+') && from === 0 && !valueOutsideSelection.includes('+');

  return `${canInsertPlus ? '+' : ''}${digits}`;
}

const inputPreprocessor: MaskitoPreprocessor = ({ data, elementState }, actionType) => {
  if (actionType === 'validation') {
    return {
      data: '',
      elementState: normalizeElementState(elementState),
    };
  }

  if (actionType === 'insert') {
    return {
      data: normalizeInsertedData(data, elementState),
      elementState,
    };
  }

  return { data, elementState };
};

const canonicalPostprocessor: MaskitoPostprocessor = (elementState) =>
  normalizeElementState(elementState);

export const E164_MASKITO_OPTIONS: MaskitoOptions = {
  mask: E164_CANDIDATE_MASK,
  postprocessors: [canonicalPostprocessor],
  preprocessors: [inputPreprocessor],
};
