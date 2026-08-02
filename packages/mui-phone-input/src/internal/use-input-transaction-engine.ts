'use client';

import { useMaskito } from '@maskito/react';
import { useMemo, useRef } from 'react';

import { normalizePhoneInputText } from '../phone-value';
import { E164_MASKITO_OPTIONS } from './e164-maskito';
import {
  type InputEngineContext,
  type InputTransactionEngineBridge,
  SELECTED_INPUT_TRANSACTION_ENGINE,
} from './input-transaction-engine';

export function useInputTransactionEngineBridge(): InputTransactionEngineBridge {
  const maskitoRef = useMaskito({ options: E164_MASKITO_OPTIONS });

  if (SELECTED_INPUT_TRANSACTION_ENGINE !== 'maskito') {
    throw new Error('Unsupported Input Transaction engine.');
  }

  const inputRef = useRef<HTMLInputElement | null>(null);
  const contextRef = useRef<InputEngineContext | null>(null);

  return useMemo(
    () => ({
      attach(input) {
        inputRef.current = input;
        maskitoRef(input);

        return () => {
          if (inputRef.current === input) {
            inputRef.current = null;
            maskitoRef(null);
          }
        };
      },
      reconcileExternal(snapshot, context) {
        contextRef.current = context;

        if (normalizePhoneInputText(snapshot.displayValue) !== snapshot.displayValue) {
          throw new TypeError(
            'Input Transaction reconciliation requires a canonical display snapshot.',
          );
        }
        if (
          snapshot.selection[0] < 0 ||
          snapshot.selection[1] < snapshot.selection[0] ||
          snapshot.selection[1] > snapshot.displayValue.length
        ) {
          throw new RangeError(
            'Input Transaction reconciliation selection is outside the display value.',
          );
        }
      },
      updateContext(context) {
        contextRef.current = context;
      },
    }),
    [maskitoRef],
  );
}
