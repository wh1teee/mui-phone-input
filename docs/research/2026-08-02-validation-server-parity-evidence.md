# Validation and server-parity evidence

Date: 2026-08-02
Bead: `mpi-oan.10`

## Public contract

The client and server entrypoints export the same pure max-metadata helpers:

- `validatePhoneValue(value, options)`;
- `formatPhoneValueForDisplay(value)`.

`validatePhoneValue` returns a serializable result with:

- `status`: `empty`, `incomplete`, `possible`, `valid`, or `invalid`;
- typed `reason`;
- `accepted` for the selected policy;
- `isPossible` and `isValid` as separate authority outputs;
- max-metadata `numberType` when known;
- the unchanged canonical Phone Value.

## Policy boundary

The default `validationMode` is `possible`. A structurally possible number is
accepted even if strict metadata does not currently mark it valid. Consumers
must opt into:

- `valid` for strict validity;
- `possible-and-type` with a non-empty `allowedNumberTypes` list;
- a custom strategy for product-specific acceptance.

Custom strategies receive authority-derived validation and Numbering Plan
Resolution. They cannot convert empty required values, incomplete drafts, or
structurally invalid values into accepted numbers.

## Component behavior

`MuiPhoneInput` computes validation continuously and includes the exact result
in each committed `onChange` detail. Internal error presentation defaults to
`validationDisplay="blur"`:

- incomplete typing is not shown as an error while the user is composing it;
- blur reveals the typed validation message;
- correcting the value clears the error immediately;
- `always` and `never` are explicit alternatives;
- `validationMessage` can replace the default message;
- an application-provided `helperText` remains authoritative content.

The blur presentation update is scheduled for the next animation frame so it
does not interrupt the click/reset event that caused focus to leave the input.
The Input Transaction engine bridge remains stable across that rerender.

## Authority evidence

`libphonenumber-js@1.13.10` remains the only authority. The implementation uses
public max-metadata APIs:

- `validatePhoneNumberLength` for typed structural reasons;
- `PhoneNumber.isPossible` and `PhoneNumber.isValid` independently;
- `PhoneNumber.getType` for explicit type policies;
- `formatIncompletePhoneNumber` for deterministic international display.

Representative evidence covers optional/required empty values, incomplete
drafts, unknown calling codes, impossible lengths, possible-but-not-strictly
valid numbers, Belarus mobile, GB fixed line, and non-geographic `+800`/`+870`.

## Safety boundary

This is structural metadata validation only. It does **not** prove that a phone
number exists, is reachable, accepts SMS or calls, or belongs to a user. The
package performs no OTP, carrier lookup, reachability check, network request,
GeoIP, telemetry, storage, or PII logging.

## Package evidence

The exact tarball is installed into production Next.js and Vite consumers. The
browser flow checks blur-default error visibility, correction clearing,
possible-by-default acceptance, resolved/non-geographic validation details,
callback cardinality, and external reset without loops on latest and minimum
React 19 / MUI 9 matrices.

Fresh exact-tip automation passes:

- 72 unit tests;
- 52 Browser Mode tests in each of Chromium, Firefox, and WebKit;
- production Next.js and Vite browser flows on latest and minimum support
  matrices.

The neutral server graph remains free of React, MUI, Emotion, DOM/browser
globals, and Node-only built-ins.

The exact post-validation artifact remains within the established budgets:

- main closure: 9,282 bytes gzip;
- server entry: 2,666 bytes gzip;
- packed tarball: 27,370 bytes.
