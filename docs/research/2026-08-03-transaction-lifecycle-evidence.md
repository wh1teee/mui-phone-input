# Phone transaction lifecycle evidence

Date: 2026-08-03
Bead: `mpi-oan.50`

## Failure boundary

Native input commits and form resets intentionally cross an asynchronous
boundary through `queueMicrotask`. Paste classification also owns a temporary
`requestAnimationFrame`. Before this slice, cleanup detached browser listeners
but did not invalidate work that was already queued. A transaction could call
consumer callbacks or update uncontrolled state after the component unmounted.

## Lifecycle contract

`usePhoneInputTransactions` now owns one active lifecycle flag and monotonic
generation. Every queued input commit, form reset and paste-reset frame captures
the current generation. Work proceeds only while the lifecycle is active and
the generation still matches.

Cleanup:

- marks the lifecycle inactive and advances its generation;
- removes form and input-engine listeners;
- clears queued transaction and callback-scheduling refs;
- clears composition, paste and controlled-reconciliation refs;
- cancels the paste animation frame.

The initial lifecycle is active before passive effects run. This preserves a
valid transaction dispatched by a parent layout effect. React Strict Mode
cleanup invalidates old work; the following setup reactivates the same hook with
the advanced generation, so an old microtask cannot clear or commit a new
transaction.

## Browser proof

Real Browser Mode tests prove:

- a controlled native input event followed by same-turn unmount emits no
  `onChange`;
- a queued form reset followed by unmount emits no `onCountryChange`;
- a queued paste transaction and its animation-frame cleanup emit no callback
  after unmount;
- composition-active pending input work is discarded;
- a new Strict Mode mount is not affected by the previous canceled transaction
  and commits exactly once;
- a transaction dispatched from a parent `useLayoutEffect` before passive
  lifecycle setup is accepted exactly once.

The complete source matrix contains 107 Browser Mode tests per engine and
passes in Chromium, Firefox and WebKit. The unit suite contains 93 tests.

## Packed consumer proof

The exact generated tarball is installed into clean production Next.js and
Vite consumers. Each consumer dispatches a native input transaction and removes
the field in the same React event. The input detaches and the externally visible
callback count remains zero. Latest and minimum React 19 / MUI 9 matrices use
the same flow.

## Scope boundary

This slice does not make input commits synchronous and does not introduce a
second transaction pipeline. It only defines cancellation and isolation for
work that already belongs to the selected Maskito-backed pipeline.
