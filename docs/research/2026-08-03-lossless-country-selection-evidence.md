# Lossless country-selection evidence

Date: 2026-08-03
Bead: `mpi-oan.30`

## Transaction boundary

`resolvePhoneCountrySelection(value, country)` is the single pure transaction
used by the public helper and `usePhoneInput`. It returns a serializable
discriminated result:

- `applied` with `calling-code-initialized`, `calling-code-preserved`, or
  `national-digits-preserved`;
- `conflict` with `incompatible-draft` or `non-geographic-draft`.

Every result contains the requested country, previous value, candidate value,
actual value, and previous/candidate/actual Numbering Plan values. Conflict
results keep `value === previousValue`; the rejected candidate remains visible
for product decisions without becoming canonical state.

`selectPhoneCountryValue` remains a compatibility wrapper over the same
transaction and therefore also returns the preserved draft on conflict.

## Component contract

`actions.selectCountry` returns the transaction result synchronously.
`onCountrySelection` observes it once. An applied result commits through the
existing `country-selection` change path; a conflict does not call `onChange`,
does not replace the uncontrolled selected country, and does not fabricate a
country transition.

This keeps `onCountryChange` as the state-transition stream delivered by
`mpi-oan.31`, while `onCountrySelection` reports user attempts and conflicts.

## Exhaustive authority proof

The pure regression matrix uses all 245 mobile examples supplied by pinned
`libphonenumber-js@1.13.10` and every different target country:

- 59,780 source/target pairs;
- 57,018 applied conversions;
- 2,762 explicit incompatible-draft conflicts;
- zero applied results collapsed to a bare target calling code;
- every conflict preserved the exact source Phone Value.

A separate non-geographic regression preserves `+80012345678` rather than
reinterpreting its subscriber digits as a Belarus national draft.

## Browser and package proof

Real Chromium Browser Mode proves:

- a US-to-Canada conflict keeps `+12025550123`, emits no `onChange`, and emits
  one typed conflict result;
- a compatible Belarus conversion commits `+3752025550123` once and emits one
  applied result.

The exact packed client entry exports the pure resolver, keeps the server entry
free of selector code, and exercises the built-in `onCountrySelection` result
in production Next.js and Vite consumers.

## Scope boundary

This slice eliminates silent data loss. Classification of incomplete
international prefixes such as `+3` and `+37` is intentionally owned by
`mpi-oan.39`; those digits must be recognized as an unfinished calling-code
prefix rather than national subscriber digits.
