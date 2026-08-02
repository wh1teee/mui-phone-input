import {
  type MaskitoPlugin,
  maskitoStrictCompositionPlugin,
  maskitoTransform,
} from '@maskito/core';
import { maskitoPhone } from '@maskito/phone';
import { useMaskito } from '@maskito/react';
import TextField from '@mui/material/TextField';
import type { MetadataJson } from 'libphonenumber-js/core';
import metadata from 'libphonenumber-js/metadata.max.json';
import {
  type ClipboardEvent,
  type CompositionEvent,
  type FormEvent,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { semanticSeparatorDeletionPreprocessor } from './semantic-separator-deletion';
import { assignInputRef, normalizePhoneValue } from './shared';
import type { InputEngineCandidateProps } from './types';

const phoneMetadata = metadata as MetadataJson;
const readinessPlugin: MaskitoPlugin = (element) => {
  element.dataset.engineReady = 'true';

  return () => {
    delete element.dataset.engineReady;
  };
};

export const MaskitoCandidate = forwardRef<HTMLInputElement, InputEngineCandidateProps>(
  function MaskitoCandidate(
    { country, fixedCallingCode = false, onChange, separator = ' ', value },
    forwardedRef,
  ) {
    const composingRef = useRef(false);
    const compositionTextRef = useRef('');
    const pendingCommitScheduledRef = useRef(false);
    const pendingDisplayValueRef = useRef<string | null>(null);
    const pasteTextRef = useRef<string | null>(null);
    const pasteResetFrameRef = useRef<number | undefined>(undefined);
    const options = useMemo(() => {
      const phoneOptions = maskitoPhone({
        format: 'INTERNATIONAL',
        metadata: phoneMetadata,
        separator,
        strict: fixedCallingCode,
        ...(country ? { countryIsoCode: country } : {}),
      });

      return {
        ...phoneOptions,
        preprocessors: [
          ...phoneOptions.preprocessors,
          semanticSeparatorDeletionPreprocessor,
        ],
        plugins: [
          ...phoneOptions.plugins,
          maskitoStrictCompositionPlugin(),
          readinessPlugin,
        ],
      };
    }, [country, fixedCallingCode, separator]);
    const maskitoRef = useMaskito({ options });
    const setInputRef = useCallback(
      (input: HTMLInputElement | null) => {
        maskitoRef(input);
        assignInputRef(forwardedRef, input);
      },
      [forwardedRef, maskitoRef],
    );
    const commit = useCallback(
      (displayValue: string) => {
        onChange(
          normalizePhoneValue(displayValue, {
            fixedCallingCode,
            ...(country ? { country } : {}),
          }),
        );
      },
      [country, fixedCallingCode, onChange],
    );
    const scheduleCommit = useCallback(
      (displayValue: string) => {
        const pendingDisplayValue = pendingDisplayValueRef.current;

        if (
          displayValue.length > 0 ||
          pendingDisplayValue === null ||
          pendingDisplayValue.length === 0
        ) {
          pendingDisplayValueRef.current = displayValue;
        }

        if (pendingCommitScheduledRef.current) {
          return;
        }

        pendingCommitScheduledRef.current = true;

        queueMicrotask(() => {
          pendingCommitScheduledRef.current = false;
          const pendingValue = pendingDisplayValueRef.current;
          pendingDisplayValueRef.current = null;

          if (!composingRef.current && pendingValue !== null) {
            commit(pendingValue);
          }
        });
      },
      [commit],
    );
    useEffect(
      () => () => {
        if (pasteResetFrameRef.current !== undefined) {
          window.cancelAnimationFrame(pasteResetFrameRef.current);
        }
      },
      [],
    );
    const handlePaste = useCallback((event: ClipboardEvent<HTMLInputElement>) => {
      pasteTextRef.current = event.clipboardData.getData('text');
    }, []);
    const handleInput = useCallback(
      (event: FormEvent<HTMLInputElement>) => {
        const inputEvent = event.nativeEvent as InputEvent;

        if (composingRef.current || inputEvent.isComposing) {
          compositionTextRef.current = inputEvent.data ?? event.currentTarget.value;
          return;
        }

        scheduleCommit(
          pasteTextRef.current ?? event.currentTarget.value ?? inputEvent.data ?? '',
        );

        if (pasteTextRef.current !== null && pasteResetFrameRef.current === undefined) {
          pasteResetFrameRef.current = window.requestAnimationFrame(() => {
            pasteTextRef.current = null;
            pasteResetFrameRef.current = undefined;
          });
        }
      },
      [scheduleCommit],
    );
    const handleCompositionEnd = useCallback(
      (event: CompositionEvent<HTMLInputElement>) => {
        composingRef.current = false;
        commit(event.data || compositionTextRef.current || event.currentTarget.value);
        compositionTextRef.current = '';
      },
      [commit],
    );

    return (
      <TextField
        fullWidth
        inputRef={setInputRef}
        label="Phone number"
        slotProps={{
          htmlInput: {
            'data-testid': 'phone-input',
            autoComplete: 'tel',
            inputMode: 'tel',
            onCompositionEnd: handleCompositionEnd,
            onCompositionStart: () => {
              pendingCommitScheduledRef.current = false;
              pendingDisplayValueRef.current = null;
              composingRef.current = true;
              compositionTextRef.current = '';
            },
            onInput: handleInput,
            onPaste: handlePaste,
          },
        }}
        value={value ? maskitoTransform(value, options) : ''}
      />
    );
  },
);
