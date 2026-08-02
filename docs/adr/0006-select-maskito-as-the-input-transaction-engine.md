# ADR 0006: Select Maskito as the Input Transaction engine

- Status: Accepted
- Date: 2026-08-02
- Decision gate: `mpi-oan.22`
- Contract version: `1`

## Context

The package needs one browser Input Transaction engine for caret-safe editing,
selection, paste, autofill, predictive replacement, IME composition, native
history, controlled reconciliation, and MUI input integration.

ADR 0005 required a real-browser bake-off between:

1. Maskito core/React as a maintained runtime foundation; and
2. an internal TypeScript adaptation of the mature
   `react-phone-number-input` / `input-format` behavior.

Neither candidate was allowed to become a phone-number authority. Parsing,
calling codes, numbering plans, possibility, validity, and number type remain
the exclusive responsibility of `libphonenumber-js`.

## Candidate baselines

### Maskito

- `@maskito/core@5.3.1`
- `@maskito/react@5.3.1`
- `@maskito/phone@5.3.1` used only by the bake-off candidate
- upstream revision `d8904823d05dbb3f9d038057634dbf98d89219e7`
- Apache-2.0

### Adapted input-format behavior

- `input-format@0.3.14`
- `react-phone-number-input@3.4.17` behavior and tests inspected
- upstream revision `0408b492e99ab81c0b667cb77b24b71b0f4d8c3b`
- MIT

The adapted candidate intentionally exposed the maintenance cost of owning the
donor behavior: it directly assigns `input.value` and selection to preserve the
donor algorithm.

## Shared contract and evidence

Both candidates were mounted through the same MUI 9 `TextField` html-input
slot and the same React-controlled harness. The exact scenario source is:

- `tests/corpus/input-transactions.ts`
- `tests/browser/input-engine-bakeoff.browser.test.tsx`
- `tests/browser/input-engine-extended.browser.test.tsx`
- `tests/unit/input-engine-numbering-policy.test.ts`
- `tests/bakeoff/results/input-engine-results.ts`

The result ledger covers all 32 input/numbering scenarios. Browser interaction
was executed in:

- Chromium 151.0.7922.34;
- Firefox 153.0;
- WebKit 26.5.

The full browser suite exercises start/middle/end insertion, semantic deletion
next to separators, one-transaction range replacement, international/national
and fixed-calling-code paste, autofill fallback, predictive replacement,
composition, Unicode digits, controlled updates, context changes, native
undo/redo, Strict Mode, MUI refs, SSR/hydration, and React Hook Form reset.

### Correctness result

Maskito has no failed scenario in the ledger.

The adapted candidate has one repeatable correctness failure:

- `input.insert.middle`: the canonical value changes, but the caret remains at
  its pre-insert position in Chromium, Firefox, and WebKit.

The Maskito candidate required four explicit package-owned policies, all
covered by regression tests:

1. coalesce duplicate native events within one committed transaction;
2. preserve raw clipboard text until the corresponding authoritative input;
3. buffer composition and commit only at `compositionend`;
4. expand separator-only delete selections to the adjacent semantic digit.

These policies are implemented through React state and Maskito processors. The
selected wrapper does not assign native input value or selection directly.

## Size and performance signals

The reproducible methodology and raw output are in
`docs/research/2026-08-02-input-engine-bakeoff-measurements.json`.

The candidate bundle measurement externalizes React, React DOM, MUI, Emotion,
and `libphonenumber-js`; therefore it compares engine-specific code and is not
a final package-size forecast.

| Candidate | Minified | Gzip | Brotli | Pure transforms/sec | Wrapper lines | Direct DOM mutation matches |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Maskito | 28,655 B | 8,392 B | 7,539 B | 31,106 | 184 | 0 |
| Adapted input-format | 9,488 B | 3,015 B | 2,680 B | 83,978 | 153 | 4 |

The adapted candidate is materially smaller and faster in the pure transform
microbenchmark. Those advantages do not outweigh the observed caret failure,
direct DOM mutation, and long-term responsibility for an internal donor fork.
Runtime size remains a package hardening target and must be re-measured after
the production-shaped tracer exists.

## Decision

Select **Maskito core/React 5.3.1** as the Input Transaction foundation.

The publishable package declares exact runtime dependencies on:

- `@maskito/core@5.3.1`;
- `@maskito/react@5.3.1`.

`@maskito/phone` is not selected as a second phone-number authority and is not
a package runtime dependency at this gate. Its behavior remains useful as a
bake-off and regression reference while production formatting and numbering
state are composed around `libphonenumber-js`.

The adapted input-format candidate is rejected as the production foundation.
It remains in development-only bake-off evidence until the tracer has safely
absorbed the retained regression scenarios.

## Frozen supporting contract

`packages/mui-phone-input/src/internal/input-transaction-engine.ts` freezes
contract version 1:

- selected engine identifier;
- semantic transaction sources;
- before/after display and selection snapshots;
- event-independent committed transaction details;
- attach, external-reconcile, and context-update bridge operations.

The public `onChange` contract must not expose DOM Event or React
SyntheticEvent. One committed Input Transaction may cause at most one public
callback. External controlled reconciliation and context changes cause none.

Any contract change requires a new ADR and a contract-version increment.

## Mobile evidence boundary

Desktop Chromium input replacement and all three desktop browser engines prove
the browser fallback and composition contracts, but they do not prove a real
Android predictive keyboard or a physical iOS IME.

No physical Android or iOS device was connected to this Work PC during
`mpi-oan.22`. The result ledger marks these scenarios `emulated-pass` and
defers physical evidence to `mpi-oan.24`. This defer does not block selecting
the engine, but it blocks release-candidate and 1.0 approval.

## Consequences

- Apache-2.0 dependency attribution ships in `THIRD_PARTY_NOTICES.md`.
- The internal tracer must use the frozen bridge instead of importing donor
  behavior throughout the component tree.
- The wrapper policies above become mandatory regression tests.
- Runtime-size and transaction-latency budgets must be calibrated again on the
  packed production tracer.
- Physical Android/iOS evidence remains an explicit external device gate.
