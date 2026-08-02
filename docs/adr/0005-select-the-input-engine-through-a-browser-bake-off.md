# Select the input transaction engine through a real-browser bake-off

Status: Accepted

Caret, deletion, range replacement, paste, autofill, IME composition, predictive mobile input, undo/redo, and controlled reconciliation are the highest-risk parts of the library. The project will not commit to maintaining an adapted caret engine or to a masking runtime before both approaches execute the same public-contract corpus in real browsers.

The initial candidates are:

- Maskito core and React integration, with its phone addon used only as a donor or internal option generator while MUI Phone Input retains canonical state, country, validation, and public API ownership;
- an internal TypeScript adaptation of proven `react-phone-number-input` and `input-format` behavior with retained upstream regressions.

The bake-off must exercise MUI `TextField`, controlled and uncontrolled ownership, middle edits, selection replacement, separators, international and national paste, prefilled calling-code paste, autofill, IME, Unicode digits, country and mask changes, fixed calling code, undo/redo, React Strict Mode, SSR/hydration, RHF reset, Chromium, Firefox, WebKit, and representative real mobile-device behavior. The selected engine is recorded in a follow-up ADR with measured correctness, maintenance, accessibility, package, license, and performance evidence.

## Consequences

- the minimal E.164 tracer is blocked until the bake-off chooses an engine;
- donor tests become one shared executable corpus rather than evidence tied to a preferred implementation;
- runtime dependency is preferred over copied general-purpose caret code when it meets the complete contract and keeps phone-domain authority outside the engine;
- a custom engine is permitted only when the external candidate cannot satisfy the verified contract without unsafe workarounds.
