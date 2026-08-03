# Explicit-country draft authority evidence

Date: 2026-08-03
Bead: `mpi-oan.29`

## Root cause

The previous resolver preserved an explicit country only after the complete
international value became valid against selected-country-only metadata.
`PhoneNumber.getPossibleCountries()` could meanwhile narrow a shared calling
code by the current national-number length and temporarily exclude the selected
country. That narrowing was treated as positive incompatibility even when the
draft was a valid prefix of a number for the selected country.

The pinned 245-country mobile-example corpus reproduced 27 selection losses
across AX, CC, CX, EH, IM, JE, SJ, and US. Complete territory examples could
also remain selected/resolved while being absent from `possibleCountries`.

## Donor authority

The exact donor is `libphonenumber-js@1.13.10`, revision
`9758fd594a531a86e0c388da4611e30142da73b2`, MIT.

Inspected source includes:

- `PhoneNumber.getPossibleCountries()`;
- `getPossibleCountriesForNumber()` and its length-only country filter;
- `Metadata.selectNumberingPlan()`;
- `NumberingPlan.nationalNumberPattern()`;
- `NumberingPlan.hasTypes()` and `NumberingPlan.type()`;
- `Type.pattern()`;
- `isValidNumber()` and `getNumberType()`.

The package continues to use donor metadata as the only numbering authority.
No country alias, calling-code, leading-digit, or number-pattern table is
maintained locally.

## Decision

For a recognized geographic calling code, an explicit country remains
compatible while at least one authority number-type pattern for that country
can still accept the current national digits as a prefix. It is cleared when:

- the detected calling code differs;
- no authority number-type pattern can accept the draft prefix;
- or the plan is non-geographic.

The pinned metadata's decimal-pattern grammar is compiled into a small generic
epsilon-NFA. It supports the complete grammar currently used by all 1,126 max
metadata type patterns: decimal literals, `\d`, decimal character classes and
ranges, non-capturing groups, alternation, `?`, and bounded repetitions. An
unsupported future metadata grammar fails fast and is covered by the metadata
update review gate.

This matcher is independently authored. It adapts authority semantics, not
donor implementation code.

## Result invariants

- all 2,348 prefixes beginning at each complete calling code across all 245
  pinned mobile examples retain their explicit country;
- genuine US/CA, RU/KZ, and `+44` conflicts still clear selection;
- selected and resolved geographic countries are included in
  `possibleCountries`;
- non-geographic plans never retain a country;
- client and neutral server entrypoints return byte-serializable equivalent
  results.

The exact `+12015550` / US reproduction now resolves to US while retaining CA
as another possible country. The complete AX example reports both FI and AX in
`possibleCountries`, while FI remains the detected metadata label and AX remains
the explicit selected/resolved country.

## Verification

- focused numbering/country-selection/entrypoint suite: 34 passed;
- full unit suite: 90 passed;
- Browser Mode: 99 passed in each of Chromium, Firefox, and WebKit;
- exact package: build, `publint`, ATTW, neutral server graph, source maps, and
  publish dry run passed;
- packed production Next.js and Vite consumers passed with latest and minimum
  React 19 / MUI 9 peer matrices, including Next.js no-JavaScript SSR and
  hydration parity.

Exact measured package sizes remain within budget:

- main closure: 20,075 bytes gzip against 25,600;
- neutral server entry: 4,794 bytes gzip against 10,240;
- packed tarball: 84,262 bytes.

No npm publication occurred.
