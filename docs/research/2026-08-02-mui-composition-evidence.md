# MUI composition and primitive evidence

Date: 2026-08-02
Bead: `mpi-oan.6`

## One state machine

`usePhoneInput` is the public controller for canonical value ownership, the
selected Maskito Input Transaction engine, Numbering Plan Resolution,
validation, form reset, focus, clear, and blur-driven validation visibility.

`MuiPhoneInput` is now a Material UI adapter over that controller. Supported
Composable Primitives consume the exact same `UsePhoneInputReturn` through
`PhoneInputProvider`; no second input, caret, parsing, country, or validation
state machine exists.

## Public composition API

The client entrypoint exports:

- `usePhoneInput`;
- `PhoneInputProvider` and `usePhoneInputContext`;
- `PhoneInputRoot`;
- `PhoneInputInput`;
- `PhoneInputCountrySelector`;
- `PhoneInputValidationMessage`.

The controller exposes:

- serializable `state` for value, display, numbering plan, validation and
  ownership;
- `actions.focus`, `actions.clear`, `actions.reset`, and
  `actions.selectCountry`;
- `getRootProps`, `getInputProps`, and `getValidationMessageProps`;
- the native input ref boundary.

Prop getters compose consumer handlers first and then preserve required input
engine, composition, paste, blur, reset and accessibility behavior. No public
controller or primitive repairs state by assigning `input.value` or calling
`setSelectionRange`.

## Accessibility and stable state

Prepared input props include:

- native `disabled`, `readOnly`, `required`, `inputMode` and autocomplete;
- `aria-invalid`, `aria-describedby` and `aria-errormessage` only when the
  referenced internal validation message exists;
- stable input/helper IDs;
- `data-phone-input-status`, `data-phone-input-plan`,
  `data-phone-input-country`, and `data-phone-input-accepted` for custom slots
  without phone-domain guessing.

Manual application error state never points to a missing internal message.
Primitives provide a polite live validation message and stable utility classes.

## MUI contract

`MuiPhoneInput` supports:

- `MuiPhoneInput` theme `defaultProps`, `styleOverrides`, and `variants`;
- `root`, `input`, `validationMessage`, and stable `countrySelector*` utility
  classes;
- exported `MuiPhoneInputOwnerState` with ownership, disabled/read-only,
  required/error, validation status and numbering-plan kind;
- inherited `TextField` `slots` and `slotProps` as the single visual
  replacement API;
- prepared refs, handlers, classes, state data and ARIA props for a custom
  `htmlInput` slot.

Runtime tests demonstrate owner-state-driven style overrides and a required
theme variant through a custom native-input slot.

## Exact package evidence

The built main entry exports the hook and primitives; the neutral server entry
exports none of them. Production Next.js and Vite consumers install the exact
`.tgz` and render both `MuiPhoneInput` and the composable API. Browser proof
covers default state, typing, callback cardinality, Numbering Plan Resolution,
validation, prepared data props, focus, clear and reset on latest and minimum
React 19 / MUI 9 matrices.

The exact post-composition artifact remains within the established budgets:

- main closure: 15,200 bytes gzip;
- server entry: 2,666 bytes gzip;
- packed tarball: 55,705 bytes.

## Scope boundary

This bead exposes stable composition boundaries already used by the default
component and consumers. The later basic selector reuses those boundaries; it
does not add speculative virtualization, flag, extension, mask, packaged
locale, RHF or Zod APIs before those capabilities exist.
