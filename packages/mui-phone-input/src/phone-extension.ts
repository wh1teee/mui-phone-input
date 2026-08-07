import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/core';

import { DEFAULT_PHONE_METADATA } from './phone-metadata';
import {
  normalizePhoneInputDigit,
  parsePhoneValue,
  type PhoneValue,
} from './phone-value';

export type PhoneExtension = string | undefined;

export interface ParsePhoneExtensionOptions {
  maxLength?: number;
}

export interface ParsedRfc3966 {
  extension: PhoneExtension;
  value: Exclude<PhoneValue, undefined>;
}

const EXTENSION_SEPARATOR = /^[\p{White_Space}().\-\u2013\u2014]$/u;
const HUMAN_EXTENSION_MARKER =
  /(?:\b(?:ext(?:ension)?|x)\.?\s*(?::|=)?\s*|#\s*)\S*\s*$/iu;
const RFC3966_PARAMETER = /;([^=;]+)(?:=([^;]*))?/gu;

export function isPhoneExtension(value: unknown): value is PhoneExtension {
  return value === undefined || (typeof value === 'string' && /^\d+$/u.test(value));
}

export function assertPhoneExtension(value: unknown): asserts value is PhoneExtension {
  if (!isPhoneExtension(value)) {
    throw new TypeError('Phone Extension must be undefined or contain digits only.');
  }
}

function assertExtensionMaxLength(maxLength: number | undefined): void {
  if (maxLength !== undefined && (!Number.isSafeInteger(maxLength) || maxLength <= 0)) {
    throw new TypeError('extensionMaxLength must be a positive integer when provided.');
  }
}

export function parsePhoneExtension(
  value: unknown,
  options: ParsePhoneExtensionOptions = {},
): PhoneExtension {
  const { maxLength } = options;
  assertExtensionMaxLength(maxLength);

  if (value === undefined || value === '') {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new TypeError('Phone Extension input must be a string or undefined.');
  }

  let digits = '';
  for (const character of value) {
    const digit = normalizePhoneInputDigit(character);
    if (digit !== undefined) {
      if (maxLength === undefined || digits.length < maxLength) {
        digits += digit;
      }
      continue;
    }
    if (!EXTENSION_SEPARATOR.test(character)) {
      throw new TypeError('Phone Extension input contains unsupported characters.');
    }
  }

  return digits.length === 0 ? undefined : digits;
}

function inspectRfc3966Parameters(uri: string): Readonly<{
  extension: string | undefined;
  valid: boolean;
}> {
  const separatorIndex = uri.indexOf(';');
  if (separatorIndex === -1) {
    return { extension: undefined, valid: true };
  }

  const parameters = uri.slice(separatorIndex);
  let consumed = '';
  let extension: string | undefined;
  let extensionCount = 0;
  let hasIsdnSubaddress = false;

  for (const match of parameters.matchAll(RFC3966_PARAMETER)) {
    consumed += match[0];
    const name = match[1]?.toLowerCase();
    const value = match[2];
    if (!name) {
      return { extension: undefined, valid: false };
    }
    if (name === 'ext') {
      extensionCount += 1;
      if (value === undefined || value.length === 0) {
        return { extension: undefined, valid: false };
      }
      extension = value;
    } else if (name === 'isub') {
      hasIsdnSubaddress = true;
    }
  }

  if (
    consumed !== parameters ||
    extensionCount > 1 ||
    (extensionCount === 1 && hasIsdnSubaddress)
  ) {
    return { extension: undefined, valid: false };
  }

  return { extension, valid: true };
}

export function parseRfc3966(uri: unknown): ParsedRfc3966 | null {
  if (typeof uri !== 'string' || !/^tel:/iu.test(uri)) {
    return null;
  }

  const normalizedUri = `tel:${uri.slice(uri.indexOf(':') + 1)}`;

  const inspected = inspectRfc3966Parameters(uri);
  if (!inspected.valid) {
    return null;
  }

  let extension: PhoneExtension;
  try {
    extension =
      inspected.extension === undefined
        ? undefined
        : parsePhoneExtension(inspected.extension);
  } catch {
    return null;
  }
  if (inspected.extension !== undefined && extension === undefined) {
    return null;
  }

  try {
    const parsed = parsePhoneNumberFromString(
      normalizedUri.replace(/;ext=[^;]*/iu, ''),
      DEFAULT_PHONE_METADATA,
    );
    if (!parsed?.number) {
      return null;
    }
    const value = parsePhoneValue(parsed.number);
    if (!value || value === '+') {
      return null;
    }
    return { extension, value };
  } catch {
    return null;
  }
}

export function hasPhoneExtensionSyntax(value: unknown): value is string {
  return typeof value === 'string' && HUMAN_EXTENSION_MARKER.test(value);
}

export function parsePhoneExtensionBearingText(
  value: unknown,
  defaultCountry?: CountryCode,
): ParsedRfc3966 | null {
  if (typeof value !== 'string' || /^tel:/iu.test(value)) {
    return null;
  }

  const trimmedValue = value.trim();
  const parsed =
    defaultCountry === undefined
      ? parsePhoneNumberFromString(trimmedValue, DEFAULT_PHONE_METADATA)
      : parsePhoneNumberFromString(
          trimmedValue,
          defaultCountry,
          DEFAULT_PHONE_METADATA,
        );
  if (!parsed?.number || parsed.ext === undefined) {
    return null;
  }

  let extension: PhoneExtension;
  try {
    extension = parsePhoneExtension(parsed.ext);
  } catch {
    return null;
  }
  if (extension === undefined || !trimmedValue.endsWith(parsed.ext)) {
    return null;
  }

  const phoneValue = parsePhoneValue(parsed.number);
  if (!phoneValue || phoneValue === '+') {
    return null;
  }

  return { extension, value: phoneValue };
}

export function serializeRfc3966(
  value: Exclude<PhoneValue, undefined>,
  extension?: PhoneExtension,
): string {
  if (!value || value === '+') {
    throw new TypeError('RFC 3966 serialization requires a non-empty Phone Value.');
  }
  const parsedValue = parsePhoneValue(value);
  if (parsedValue !== value) {
    throw new TypeError('RFC 3966 serialization requires a canonical Phone Value.');
  }
  assertPhoneExtension(extension);

  const parsed = parsePhoneNumberFromString(value, DEFAULT_PHONE_METADATA);
  if (!parsed) {
    throw new TypeError('RFC 3966 serialization requires a parseable Phone Value.');
  }
  if (extension !== undefined) {
    parsed.setExt(extension);
  }
  return parsed.getURI();
}
