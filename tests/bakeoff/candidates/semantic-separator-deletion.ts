import type { MaskitoPreprocessor } from '@maskito/core';

function isSeparator(character: string | undefined): boolean {
  return Boolean(character && !/[\p{Decimal_Number}+]/u.test(character));
}

export const semanticSeparatorDeletionPreprocessor: MaskitoPreprocessor = (
  { elementState, data },
  actionType,
) => {
  const { selection, value } = elementState;
  const [from, to] = selection;
  const selectedText = value.slice(from, to);
  const selectsOnlySeparators =
    selectedText.length > 0 && [...selectedText].every(isSeparator);

  if (from !== to && !selectsOnlySeparators) {
    return { data, elementState };
  }

  if (
    actionType === 'deleteBackward' &&
    (selectsOnlySeparators || isSeparator(value[from - 1]))
  ) {
    let digitIndex = from - 1;

    while (digitIndex >= 0 && isSeparator(value[digitIndex])) {
      digitIndex -= 1;
    }

    if (digitIndex >= 0 && /\p{Decimal_Number}/u.test(value[digitIndex] ?? '')) {
      return {
        data,
        elementState: {
          selection: [digitIndex, to],
          value,
        },
      };
    }
  }

  if (
    actionType === 'deleteForward' &&
    (selectsOnlySeparators || isSeparator(value[from]))
  ) {
    let digitIndex = to;

    while (digitIndex < value.length && isSeparator(value[digitIndex])) {
      digitIndex += 1;
    }

    if (
      digitIndex < value.length &&
      /\p{Decimal_Number}/u.test(value[digitIndex] ?? '')
    ) {
      return {
        data,
        elementState: {
          selection: [from, digitIndex + 1],
          value,
        },
      };
    }
  }

  return { data, elementState };
};
