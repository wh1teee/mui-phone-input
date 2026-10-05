'use client';

import { useEffect, useState } from 'react';

type CopyState = 'copied' | 'error' | 'idle';

export function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<CopyState>('idle');

  useEffect(() => {
    if (state === 'idle') return;
    const timer = window.setTimeout(() => setState('idle'), 1600);
    return () => window.clearTimeout(timer);
  }, [state]);

  return (
    <button
      aria-label={state === 'copied' ? 'Copied' : 'Copy code'}
      className="docs-copy"
      data-state={state}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setState('copied');
        } catch {
          setState('error');
        }
      }}
      type="button"
    >
      {/* Both icons share one cell and crossfade, so the button never changes size. */}
      <span className="docs-copy-icons" aria-hidden="true">
        <svg
          aria-hidden="true"
          className="docs-copy-idle"
          fill="none"
          viewBox="0 0 16 16"
        >
          <rect
            height="9"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
            width="9"
            x="5.5"
            y="5.5"
          />
          <path
            d="M10.5 3.5v-.25A1.75 1.75 0 0 0 8.75 1.5h-5.5A1.75 1.75 0 0 0 1.5 3.25v5.5c0 .97.78 1.75 1.75 1.75h.25"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <svg
          aria-hidden="true"
          className="docs-copy-done"
          fill="none"
          viewBox="0 0 16 16"
        >
          <path
            d="m3 8.5 3 3 7-7"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.75"
          />
        </svg>
      </span>
      <span className="docs-visually-hidden" aria-live="polite">
        {state === 'copied'
          ? 'Copied to clipboard'
          : state === 'error'
            ? 'Copy failed'
            : ''}
      </span>
    </button>
  );
}
