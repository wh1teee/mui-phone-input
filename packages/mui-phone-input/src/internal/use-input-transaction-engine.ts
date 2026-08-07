'use client';

import type { MaskitoOptions } from '@maskito/core';
import { useMaskito } from '@maskito/react';
import { useMemo, useRef } from 'react';

import {
  type InputEngineContext,
  type InputTransactionEngineBridge,
  SELECTED_INPUT_TRANSACTION_ENGINE,
} from './input-transaction-engine';

const PRESENTATION_MASKITO_OPTIONS: MaskitoOptions = {
  // Phone syntax, formatting, and canonicalization stay in the package authority.
  // Maskito owns the DOM transaction lifecycle without rewriting input before
  // React classifies paste/history/composition/autofill semantics.
  mask: /^[\s\S]*$/u,
};

export function useInputTransactionEngineBridge(
  context: InputEngineContext,
): InputTransactionEngineBridge {
  void context;
  const maskitoRef = useMaskito({ options: PRESENTATION_MASKITO_OPTIONS });
  const maskitoRefRef = useRef(maskitoRef);
  maskitoRefRef.current = maskitoRef;

  if (SELECTED_INPUT_TRANSACTION_ENGINE !== 'maskito') {
    throw new Error('Unsupported Input Transaction engine.');
  }

  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextRef = useRef<InputEngineContext | null>(null);

  return useMemo(
    () => ({
      attach(input) {
        inputRef.current = input;
        maskitoRefRef.current(input);

        return () => {
          if (inputRef.current === input) {
            inputRef.current = null;
            maskitoRefRef.current(null);
          }
        };
      },
      reconcileExternal(snapshot, nextContext) {
        contextRef.current = nextContext;
        if (
          snapshot.selection[0] < 0 ||
          snapshot.selection[1] < snapshot.selection[0] ||
          snapshot.selection[1] > snapshot.displayValue.length
        ) {
          throw new RangeError(
            'Input Transaction reconciliation selection is outside the display value.',
          );
        }

        const input = inputRef.current;
        if (input && input.value !== snapshot.displayValue) {
          input.value = snapshot.displayValue;
        }
        if (
          input?.matches(':focus') &&
          (input.selectionStart !== snapshot.selection[0] ||
            input.selectionEnd !== snapshot.selection[1])
        ) {
          input.setSelectionRange(snapshot.selection[0], snapshot.selection[1]);
        }
      },
      updateContext(nextContext) {
        contextRef.current = nextContext;
      },
    }),
    [],
  );
}
