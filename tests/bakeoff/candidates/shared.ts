import {
  AsYouType,
  type CountryCode,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from 'libphonenumber-js/max';
import type { ForwardedRef } from 'react';

export type PhoneValue = `+${string}` | undefined;

export type NormalizePhoneValueOptions = Readonly<{
  country?: CountryCode;
  fixedCallingCode?: boolean;
}>;

const DECIMAL_DIGIT_RANGES = [
  [0x0030, 0x0039],
  [0x0660, 0x0669],
  [0x06f0, 0x06f9],
  [0x0966, 0x096f],
  [0xff10, 0xff19],
] as const;

function normalizeDecimalDigit(character: string): string | undefined {
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

export function parsePhoneCharacter(
  character: string,
  parsedValue: string,
): string | undefined {
  const digit = normalizeDecimalDigit(character);

  if (digit !== undefined) {
    return digit;
  }

  if (character === '+' && parsedValue.length === 0) {
    return '+';
  }

  return undefined;
}

function normalizeCharacters(text: string): string {
  let normalized = '';

  for (const character of text) {
    const digit = normalizeDecimalDigit(character);

    if (digit !== undefined) {
      normalized += digit;
    } else if (character === '+' && normalized.length === 0) {
      normalized += '+';
    }
  }

  return normalized;
}

export function normalizePhoneValue(
  text: string,
  options: NormalizePhoneValueOptions = {},
): PhoneValue {
  const { country, fixedCallingCode = false } = options;
  const normalized = normalizeCharacters(text);
  const digits = normalized.replaceAll(/\D/gu, '');
  const hasInternationalPrefix = normalized.startsWith('+');

  if (digits.length === 0 && !hasInternationalPrefix) {
    return undefined;
  }

  let candidate = `+${digits}` as PhoneValue;

  if (country && !hasInternationalPrefix) {
    candidate = `+${getCountryCallingCode(country)}${digits}`;
  }

  if (country && fixedCallingCode && candidate) {
    const callingCode = getCountryCallingCode(country);

    if (!candidate.startsWith(`+${callingCode}`)) {
      const parsed = parsePhoneNumberFromString(candidate);
      const nationalDigits = parsed?.nationalNumber ?? digits;
      candidate = `+${callingCode}${nationalDigits}`;
    }
  }

  return candidate;
}

export function formatPhoneValue(
  value: PhoneValue,
  country?: CountryCode,
  fixedCallingCode = false,
  separator = ' ',
): { text: string; template: string } {
  if (!value) {
    return { text: '', template: '' };
  }

  const formatter = new AsYouType(fixedCallingCode ? country : undefined);
  const text = formatter.input(value).replaceAll(' ', separator);
  const template = (formatter.getTemplate() ?? '').replaceAll(' ', separator);

  return { text, template };
}

export function assignInputRef(
  ref: ForwardedRef<HTMLInputElement>,
  input: HTMLInputElement | null,
) {
  if (typeof ref === 'function') {
    ref(input);
  } else if (ref) {
    ref.current = input;
  }
}
