# WebKit stale-selection reconciliation evidence

Date: 2026-09-21
Bead: `mpi-oan.20`
Downstream signal: RideOS `rideos-wluq`

## Root cause

A production WebKit recovery flow advanced the native `<input>` value and caret
before React flushed the passive reconciliation effect for the previously
rendered phone presentation. The effect read `selectionStart` and `selectionEnd`
from the new live DOM string, but paired those offsets with the older
`presentation.displayValue`. The Input Transaction bridge correctly rejected
that internally inconsistent snapshot with:

`RangeError: Input Transaction reconciliation selection is outside the display value.`

The guard was not the defect. The caller created a snapshot whose value and
selection came from different points in time.

## Resolution

Reconciliation now reads a live DOM selection only when `input.value` exactly
matches the authoritative display value used by the same snapshot. When the DOM
has already advanced, the current authoritative presentation supplies its own
end selection. The bridge then restores the authoritative value and coherent
caret. No offset is clamped, the integrity guard remains enabled, and normal
input transactions continue using their captured logical selection.

## Regression proof

A browser harness mutates the native DOM value and caret in a layout effect,
which deterministically places the mutation between React commit and the phone
controller's passive reconciliation effect. Before the fix, WebKit reproduces
the exact RangeError and React removes the failed tree. After the fix, the
controller restores `+1` with selection `[2, 2]`.

The focused regression passes in Chromium, Firefox, and WebKit. The stable release gate
also runs the complete Chromium suite plus focused Firefox/WebKit browser and
WCAG matrices, exact-tarball Next.js/Vite consumers, and renderer/bundle
contracts.
