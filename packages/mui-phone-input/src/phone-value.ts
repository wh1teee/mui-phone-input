export type PhoneValue = `+${string}` | undefined;

const DECIMAL_DIGIT_RANGES = [
  [0x0030, 0x0039],
  [0x0660, 0x0669],
  [0x06f0, 0x06f9],
  [0x0966, 0x096f],
  [0xff10, 0xff19],
] as const;

const DISPLAY_SEPARATOR = /^[\p{White_Space}().\-\u2013\u2014]$/u;

export function normalizePhoneInputDigit(character: string): string | undefined {
  const codePoint = character.codePointAt(0);

  if (codePoint === undefined) {
    return undefined;
  }

  for (const [start, end] of DECIMAL_DIGIT_RANGES) {
    if (codePoint >= start && codePoint <= end) {
      return String(codePoint - start);
    }
  }

  return undefined;
}

export function isPhoneValue(value: unknown): value is PhoneValue {
  return value === undefined || (typeof value === 'string' && /^\+\d*$/u.test(value));
}

export function assertPhoneValue(value: unknown): asserts value is PhoneValue {
  if (!isPhoneValue(value)) {
    throw new TypeError(
      'Phone Value must be undefined or a leading plus followed only by digits.',
    );
  }
}

export function parsePhoneValue(value: unknown): PhoneValue {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new TypeError('Phone Value input must be a string or undefined.');
  }

  let digits = '';
  let hasPlus = false;
  let hasSignificantCharacter = false;

  for (const character of value) {
    const digit = normalizePhoneInputDigit(character);

    if (digit !== undefined) {
      digits += digit;
      hasSignificantCharacter = true;
      continue;
    }

    if (character === '+') {
      if (hasPlus || hasSignificantCharacter) {
        throw new TypeError('Phone Value input contains an invalid plus sign.');
      }

      hasPlus = true;
      hasSignificantCharacter = true;
      continue;
    }

    if (DISPLAY_SEPARATOR.test(character)) {
      continue;
    }

    throw new TypeError('Phone Value input contains unsupported characters.');
  }

  if (!hasSignificantCharacter) {
    return undefined;
  }

  return `+${digits}`;
}

export function normalizePhoneInputText(value: string): string {
  let digits = '';
  let hasPlus = false;

  for (const character of value) {
    const digit = normalizePhoneInputDigit(character);

    if (digit !== undefined) {
      digits += digit;
    } else if (character === '+' && !hasPlus && digits.length === 0) {
      hasPlus = true;
    }
  }

  return digits.length > 0 || hasPlus ? `+${digits}` : '';
}
