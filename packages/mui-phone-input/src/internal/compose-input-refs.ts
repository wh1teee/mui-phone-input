import type { Ref, RefCallback } from 'react';

/** Preserve React 19 callback-ref cleanup, including the transaction engine. */
export function composeInputRefs<T>(
  ...refs: Array<Ref<T> | undefined>
): RefCallback<T> {
  return (value) => {
    const cleanups = refs.map((ref) => {
      if (typeof ref === 'function') return ref(value);
      if (ref) ref.current = value;
      return undefined;
    });
    return () => {
      refs.forEach((ref, index) => {
        const cleanup = cleanups[index];
        if (typeof cleanup === 'function') cleanup();
        else if (typeof ref === 'function') ref(null);
        else if (ref) ref.current = null;
      });
    };
  };
}
