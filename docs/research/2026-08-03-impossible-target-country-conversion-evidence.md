# Impossible target-country conversion evidence

Date: 2026-08-03
Bead: `mpi-oan.48`

## Root cause

Country selection synthesizes a candidate by replacing the calling code while
preserving national digits. The previous transaction accepted that candidate
whenever Numbering Plan Resolution could retain the requested country. That is
the correct boundary for incomplete input, but it is insufficient after the
source has already become a structurally possible complete number: the same
digits can remain a valid prefix for the target country while still having an
impossible current target length.

At the `mpi-oan.29` exact foundation, the complete 245 × 245 authority-example
matrix contained 60,025 source/target pairs. The transaction applied 10,455
pairs; 3,022 of those applied candidates were impossible under isolated target-
country metadata.

The current minimal live reproduction is the Ascension Island mobile example
`+24740123` switched to Azerbaijan. The synthesized candidate `+99440123`
retains an AZ-compatible prefix but is not possible at its current length for
AZ. It was previously committed as `national-digits-preserved`.

The review's historical `+12025550123` to Belarus reproduction remains a
recoverable conflict, but pinned `libphonenumber-js@1.13.10` now reports the
synthesized `+3752025550123` as length-possible for BY. It is rejected by the
selected-country number pattern and therefore remains classified as
`incompatible-draft`, not `impossible-target-draft`.

## Donor authority

The sole numbering authority remains `libphonenumber-js@1.13.10`, revision
`9758fd594a531a86e0c388da4611e30142da73b2`, MIT.

Inspected authority surfaces:

- generic `isPossiblePhoneNumber()` for source completeness;
- core `isPossiblePhoneNumber(value, metadata)` with one-country max metadata
  for target structural possibility;
- `Metadata.selectNumberingPlan()` and `NumberingPlan.possibleLengths()`;
- selected-country number-type patterns already adopted by `mpi-oan.29` for
  incomplete-prefix compatibility.

No local length, country, calling-code, or number-pattern table is introduced.

## Decision

Conflict classification is ordered as follows:

1. a complete non-geographic draft with national digits is
   `non-geographic-draft`;
2. when the source is generically possible and the synthesized candidate is
   not possible under isolated target-country metadata, the result is
   `impossible-target-draft`;
3. other selected-country pattern or calling-code incompatibilities remain
   `incompatible-draft`.

Incomplete source drafts keep the `mpi-oan.29` behavior: they may be applied
while an authority target pattern can still accept further digits. Every
conflict preserves the original Phone Value and exposes the rejected
`candidateValue` and its Numbering Plan for product decisions.

## Public transaction and callbacks

`resolvePhoneCountrySelection('+24740123', 'AZ')` returns one serializable
conflict:

- `value` and `previousValue`: `+24740123`;
- `candidateValue`: `+99440123`;
- reason: `impossible-target-draft`;
- target country: `AZ`.

The component and composable controller emit exactly one `onCountrySelection`
result for the rejected user action. They do not commit a value, mutate selected
country, emit `onChange`, or emit `onCountryChange`.

## Exhaustive and consumer proof

The final 245 × 245 matrix classifies all 60,025 authority-example pairs:

- 7,433 applied;
- 52,592 conflicts;
- zero applied complete-source conversions whose candidate is impossible for
  the target country.

Source verification contains 93 unit tests and 100 Browser Mode tests in each
of Chromium, Firefox, and WebKit. The exact packed Next.js and Vite consumers,
under latest and minimum React 19 / MUI 9 peer matrices, load `+24740123`, select
AZ through the built-in semantic Country Selector, and prove unchanged value,
callback count, country-transition details, and the typed conflict result.

Package verification covers generated declaration types, exact pure result,
`publint`, ATTW, neutral server graph, source maps, and publish dry run.

Current package measurements remain within budget:

- main closure: 20,150 bytes gzip against 25,600;
- neutral server entry: 4,794 bytes gzip against 10,240;
- packed tarball: 84,544 bytes.

No npm publication occurred.
