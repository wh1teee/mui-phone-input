# Input-engine real-mobile evidence status

Date: 2026-08-02
Bead: `mpi-oan.22`

## Evidence available in this checkout

The shared candidates were exercised through real Playwright browser engines:

- Chromium 151.0.7922.34;
- Firefox 153.0;
- WebKit 26.5.

The browser corpus includes authoritative `input` replacement, composition
lifecycle, Unicode digits, fixed calling code, clipboard paste, MUI refs,
SSR/hydration, Strict Mode, RHF reset, and native undo/redo.

Desktop Chromium also executes an `insertReplacementText` predictive-input
model. This is useful fallback evidence but is **not** physical Android proof.
WebKit executes the composition lifecycle but is **not** physical iOS Safari
or a real iOS keyboard.

## Evidence not available

No physical Android Chrome or iOS Safari device was connected to the Work PC.
The following cannot be truthfully closed by desktop automation:

- Android Gboard/Samsung predictive replacement and suggestion acceptance;
- iOS keyboard composition and autofill behavior;
- hardware-specific selection handles and virtual-keyboard viewport effects.

## Gate

`mpi-oan.24` owns the required physical-device evidence. The machine-readable
result ledger marks `input.android.predictive` and `input.ime.composition` as
`emulated-pass` with `realDeviceStatus = deferred-to-mpi-oan.24`.

This limitation does not block the engine decision. It remains blocking for a
feature-complete release candidate and `1.0`.
