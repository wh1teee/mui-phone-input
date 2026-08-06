import {
  AsYouType,
  type CountryCode,
  getCountryCallingCode,
  parseDigits,
} from 'libphonenumber-js/core';

import { DEFAULT_PHONE_METADATA, type PhoneMetadata } from './phone-metadata';
import { formatPhoneValueForDisplay } from './phone-validation';
import { assertPhoneValue, type PhoneValue, parsePhoneValue } from './phone-value';

export type PhoneInputDisplayMode =
  | 'international'
  | 'national'
  | 'international-fixed-calling-code';

export interface DisplayMask {
  pattern: string;
}

export interface LogicalCaretMapping {
  logicalToDisplay: readonly number[];
}

export interface FormatStrategyResult {
  displayValue: string;
  logicalCaretPositions: readonly number[];
}

export interface FormatStrategyContext {
  automatic: FormatStrategyResult;
  country: CountryCode | null;
  displayMode: PhoneInputDisplayMode;
  locale: string;
  value: PhoneValue;
}

export type FormatStrategy = (context: FormatStrategyContext) => FormatStrategyResult;

export interface PhoneInputFormatOptions {
  country?: CountryCode | null;
  displayMask?: DisplayMask;
  displayMode?: PhoneInputDisplayMode;
  formatStrategy?: FormatStrategy;
  locale?: string;
  metadata?: PhoneMetadata;
}

export interface PhoneInputPresentation {
  displayValue: string;
  mapping: LogicalCaretMapping;
  value: PhoneValue;
}

function digitEndOffsets(displayValue: string): number[] {
  const offsets: number[] = [];
  let offset = 0;

  for (const character of displayValue) {
    offset += character.length;
    if (character >= '0' && character <= '9') {
      offsets.push(offset);
    }
  }

  return offsets;
}

export function logicalCaretFromDisplayOffset(
  mapping: LogicalCaretMapping,
  offset: number,
): number {
  let logical = 0;
  while (
    logical + 1 < mapping.logicalToDisplay.length &&
    (mapping.logicalToDisplay[logical + 1] ?? 0) <= offset
  ) {
    logical += 1;
  }
  return logical;
}

function createMapping(
  logicalDigits: number,
  displayValue: string,
  hiddenDigits = 0,
): LogicalCaretMapping {
  const digitOffsets = digitEndOffsets(displayValue);
  const visibleDigits = Math.max(0, logicalDigits - hiddenDigits);
  const displayedDigits = parseDigits(displayValue).length;
  const syntheticDigits = Math.max(0, displayedDigits - visibleDigits);
  const logicalToDisplay = Array.from<number>({ length: hiddenDigits + 1 }).fill(
    hiddenDigits === 0 && displayValue.startsWith('+') ? 1 : 0,
  );

  for (let index = 0; index < visibleDigits; index += 1) {
    logicalToDisplay.push(digitOffsets[syntheticDigits + index] ?? displayValue.length);
  }

  return { logicalToDisplay };
}

function formatAutomatic(
  value: PhoneValue,
  country: CountryCode | null,
  displayMode: PhoneInputDisplayMode,
  metadata: PhoneMetadata,
): Readonly<{ displayValue: string; mapping: LogicalCaretMapping }> {
  if (
    displayMode === 'international-fixed-calling-code' &&
    country &&
    value === undefined
  ) {
    const displayValue = `+${getCountryCallingCode(country, metadata)} `;
    return {
      displayValue,
      mapping: {
        logicalToDisplay: [displayValue.length],
      },
    };
  }
  const internationalDisplay = formatPhoneValueForDisplay(value, metadata);
  const logicalDigits = value?.length ? value.length - 1 : 0;

  if (displayMode === 'national' && country && value) {
    const callingCode = getCountryCallingCode(country, metadata);
    if (value.slice(1).startsWith(callingCode)) {
      const nationalDisplay = new AsYouType(country, metadata).input(
        value.slice(callingCode.length + 1),
      );
      if (nationalDisplay) {
        return {
          displayValue: nationalDisplay,
          mapping: createMapping(logicalDigits, nationalDisplay, callingCode.length),
        };
      }
    }
  }

  return {
    displayValue: internationalDisplay,
    mapping: createMapping(logicalDigits, internationalDisplay),
  };
}

export function parsePhoneInputPresentation(
  displayValue: string,
  options: Pick<PhoneInputFormatOptions, 'country' | 'displayMode' | 'metadata'> = {},
): PhoneValue {
  const country = options.country ?? null;
  const displayMode = options.displayMode ?? 'international';
  const metadata = options.metadata ?? DEFAULT_PHONE_METADATA;
  if (displayValue.trim().length === 0) {
    return undefined;
  }

  if (displayMode === 'national' && country) {
    const formatter = new AsYouType(country, metadata);
    formatter.input(displayValue);
    const value = formatter.getNumberValue();
    if (value === undefined) {
      return undefined;
    }
    assertPhoneValue(value);
    return value;
  }

  const value = parsePhoneValue(displayValue);
  if (displayMode === 'international-fixed-calling-code' && country && value) {
    const callingCode = getCountryCallingCode(country, metadata);
    if (value === `+${callingCode}`) {
      return undefined;
    }
  }
  return value;
}

function assertDisplayMask(mask: DisplayMask): void {
  if (!mask.pattern.includes('#') || !/^[# +().\-–—]*$/u.test(mask.pattern)) {
    throw new TypeError(
      'Invalid Display Mask: use # digit slots and presentation separators only.',
    );
  }
}

function applyFormatStrategy(
  automatic: Readonly<{ displayValue: string; mapping: LogicalCaretMapping }>,
  strategy: FormatStrategy,
  value: PhoneValue,
  country: CountryCode | null,
  displayMode: PhoneInputDisplayMode,
  locale: string,
): Readonly<{ displayValue: string; mapping: LogicalCaretMapping }> {
  const automaticResult: FormatStrategyResult = {
    displayValue: automatic.displayValue,
    logicalCaretPositions: automatic.mapping.logicalToDisplay,
  };
  const result = strategy({
    automatic: automaticResult,
    country,
    displayMode,
    locale,
    value,
  });

  if (
    !result ||
    typeof result.displayValue !== 'string' ||
    !Array.isArray(result.logicalCaretPositions)
  ) {
    throw new TypeError(
      'Invalid Format Strategy: return displayValue and logical caret positions.',
    );
  }
  const expectedDigits = automatic.displayValue.replace(/\D/gu, '');
  const actualDigits = result.displayValue.replace(/\D/gu, '');
  if (actualDigits !== expectedDigits) {
    throw new TypeError(
      'Format Strategy must preserve the automatic presentation digits without adding, removing, or reordering them.',
    );
  }
  if (
    result.logicalCaretPositions.length !== automatic.mapping.logicalToDisplay.length
  ) {
    throw new TypeError(
      `Format Strategy must return ${automatic.mapping.logicalToDisplay.length} logical caret positions for this Phone Value.`,
    );
  }

  let previous = -1;
  for (const position of result.logicalCaretPositions) {
    if (
      !Number.isInteger(position) ||
      position < 0 ||
      position > result.displayValue.length ||
      position < previous
    ) {
      throw new RangeError(
        'Format Strategy logical caret positions must be ordered integer offsets inside displayValue.',
      );
    }
    previous = position;
  }

  return {
    displayValue: result.displayValue,
    mapping: {
      logicalToDisplay: [...result.logicalCaretPositions],
    },
  };
}

function applyDisplayMask(
  automatic: Readonly<{ displayValue: string; mapping: LogicalCaretMapping }>,
  mask: DisplayMask,
): Readonly<{ displayValue: string; mapping: LogicalCaretMapping }> {
  assertDisplayMask(mask);
  const digits = parseDigits(automatic.displayValue);
  const slotCount = [...mask.pattern].filter((character) => character === '#').length;

  if (digits.length === 0 || digits.length > slotCount) {
    return automatic;
  }

  let digitIndex = 0;
  let displayValue = '';
  for (const token of mask.pattern) {
    if (token === '#') {
      const digit = digits[digitIndex];
      if (digit === undefined) {
        break;
      }
      displayValue += digit;
      digitIndex += 1;
      continue;
    }

    if (digitIndex < digits.length) {
      displayValue += token;
    }
  }

  let hiddenDigits = 0;
  while (automatic.mapping.logicalToDisplay[hiddenDigits + 1] === 0) {
    hiddenDigits += 1;
  }
  const mapping = createMapping(
    automatic.mapping.logicalToDisplay.length - 1,
    displayValue,
    hiddenDigits,
  );
  return { displayValue, mapping };
}

export function formatPhoneInputPresentation(
  value: PhoneValue,
  options: PhoneInputFormatOptions = {},
): PhoneInputPresentation {
  assertPhoneValue(value);
  const country = options.country ?? null;
  const displayMode = options.displayMode ?? 'international';
  const locale = options.locale ?? 'en';
  const metadata = options.metadata ?? DEFAULT_PHONE_METADATA;
  if (options.displayMask && options.formatStrategy) {
    throw new TypeError(
      'Configure either displayMask or formatStrategy, not both; Format Strategy is the advanced presentation override.',
    );
  }
  const automatic = formatAutomatic(value, country, displayMode, metadata);
  const presentation = options.formatStrategy
    ? applyFormatStrategy(
        automatic,
        options.formatStrategy,
        value,
        country,
        displayMode,
        locale,
      )
    : options.displayMask
      ? applyDisplayMask(automatic, options.displayMask)
      : automatic;

  return {
    ...presentation,
    value,
  };
}
