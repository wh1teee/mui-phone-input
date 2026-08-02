import TextField from '@mui/material/TextField';
import {
  onChange as donorOnChange,
  onKeyDown as donorOnKeyDown,
  type FormatFunction,
  format as mapFormattedSelection,
  parse as mapParsedSelection,
} from 'input-format';
import {
  type ChangeEvent,
  type CompositionEvent,
  type FormEvent,
  forwardRef,
  type KeyboardEvent,
  useCallback,
  useMemo,
  useRef,
} from 'react';

import {
  assignInputRef,
  formatPhoneValue,
  normalizePhoneValue,
  parsePhoneCharacter,
} from './shared';
import type { InputEngineCandidateProps } from './types';

export const AdaptedInputFormatCandidate = forwardRef<
  HTMLInputElement,
  InputEngineCandidateProps
>(function AdaptedInputFormatCandidate(
  { country, fixedCallingCode = false, onChange, separator = ' ', value },
  forwardedRef,
) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const composingRef = useRef(false);
  const compositionTextRef = useRef('');
  const formatter = useMemo<FormatFunction>(
    () =>
      (parsedValue = '') =>
        formatPhoneValue(
          normalizePhoneValue(parsedValue, {
            fixedCallingCode,
            ...(country ? { country } : {}),
          }),
          country,
          fixedCallingCode,
          separator,
        ),
    [country, fixedCallingCode, separator],
  );
  const setInputRef = useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input;
      assignInputRef(forwardedRef, input);
    },
    [forwardedRef],
  );
  const commitParsedValue = useCallback(
    (parsedValue: string) => {
      onChange(
        normalizePhoneValue(parsedValue, {
          fixedCallingCode,
          ...(country ? { country } : {}),
        }),
      );
    },
    [country, fixedCallingCode, onChange],
  );
  const reconcileInput = useCallback(
    (input: HTMLInputElement) => {
      const parsed = mapParsedSelection(
        input.value,
        input.selectionStart ?? input.value.length,
        parsePhoneCharacter,
      );
      const formatted = mapFormattedSelection(parsed.value, parsed.caret, formatter);

      input.value = formatted.text;
      input.setSelectionRange(formatted.caret, formatted.caret);
      commitParsedValue(parsed.value);
    },
    [commitParsedValue, formatter],
  );
  const handleInput = useCallback(
    (event: FormEvent<HTMLInputElement>) => {
      const inputEvent = event.nativeEvent as InputEvent;

      if (composingRef.current || inputEvent.isComposing) {
        compositionTextRef.current = inputEvent.data ?? event.currentTarget.value;
        return;
      }

      donorOnChange(
        event as unknown as ChangeEvent<HTMLInputElement>,
        event.currentTarget,
        parsePhoneCharacter,
        formatter,
        commitParsedValue,
      );
    },
    [commitParsedValue, formatter],
  );
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      const input = inputRef.current;

      if (input) {
        donorOnKeyDown(event, input, parsePhoneCharacter, formatter, commitParsedValue);
      }
    },
    [commitParsedValue, formatter],
  );
  const handleCompositionEnd = useCallback(
    (event: CompositionEvent<HTMLInputElement>) => {
      composingRef.current = false;
      event.currentTarget.value =
        event.data || compositionTextRef.current || event.currentTarget.value;
      event.currentTarget.setSelectionRange(
        event.currentTarget.value.length,
        event.currentTarget.value.length,
      );
      reconcileInput(event.currentTarget);
      compositionTextRef.current = '';
    },
    [reconcileInput],
  );

  return (
    <TextField
      fullWidth
      inputRef={setInputRef}
      label="Phone number"
      slotProps={{
        htmlInput: {
          'data-engine-ready': 'true',
          'data-testid': 'phone-input',
          autoComplete: 'tel',
          inputMode: 'tel',
          onCompositionEnd: handleCompositionEnd,
          onCompositionStart: () => {
            composingRef.current = true;
            compositionTextRef.current = '';
          },
          onInput: handleInput,
          onKeyDown: handleKeyDown,
        },
      }}
      value={formatPhoneValue(value, country, fixedCallingCode, separator).text}
    />
  );
});
