# Country-stripped autofill authority evidence

Date: 2026-08-05
Bead: `mpi-q19.10`
Launch SHA: `03ec363ce292a22c9f7b30fbc8d5d909ec50bab0`

## Root cause

`resolveCompleteNationalPhoneValue()` parsed a national replacement with the
global max metadata, then required both `phoneNumber.country ===
selectedCountry` and `phoneNumber.isValid()` before applying the existing
selected-country possibility check.

Those guards created two conflicting authorities:

- globally ambiguous territory examples were labelled with their parent
  numbering country and rejected even though the explicit selected territory
  remained authoritative;
- values accepted by the public default `validationMode="possible"` policy
  were rejected during autofill normalization when strict validity was false.

The confirmed global-detection mismatches were AX/FI, BL/GP, CC/AU, CX/AU,
EH/MA, IM/GB, MF/GP, SJ/NO, and VA/IT.

## Donor-first evidence

The numbering donor remains `libphonenumber-js@1.13.10`, revision
`9758fd594a531a86e0c388da4611e30142da73b2`, MIT.

The exact installed source was inspected through CodeGraph:

- `parsePhoneNumberFromString()` with an explicit default country and custom
  metadata;
- `PhoneNumber.getPossibleCountries()`, `isPossible()`, and `isValid()`;
- `getCountryByNationalNumber()` and its documented parent/main-country result
  for indistinguishable shared-numbering-plan patterns;
- `Metadata.selectNumberingPlan()` and selected-country numbering metadata.

The exact installed `react-phone-number-input@3.4.17` and
`input-format@0.3.14` sources were also inspected. They keep explicit country
context in parsing/formatting and input transaction handling, but do not add a
strict-validity requirement to normalization. No donor source was copied and
no new donor or licence action was introduced, so `DONORS.md` and
`donors/manifest.json` remain unchanged.

## Decision

National replacement parsing now receives the same selected-country-only
metadata already used by `isPhoneValuePossibleForCountry()`. This produces the
E.164 candidate in explicit selected-country context, including national-prefix
handling, without relying on the globally detected country label.

The candidate is accepted only when the existing selected-country structural
possibility authority accepts it. Strict validity remains a caller-selected
validation policy rather than a hidden autofill-normalization rule.

An authoritative complete-field replacement now emits one typed `onChange`
callback even when normalization produces the existing canonical value. This
is limited to the already narrow autofill gate and does not remove ordinary
idempotence for incremental input or external controlled reconciliation.

The transaction gate remains unchanged and narrow: complete-field
`insertReplacementText`, non-composing input, known selected country, and no
international `+` in the replacement. Ordinary input, partial replacement,
composition, controlled rollback, and country-transition coalescing continue
through their existing transaction paths.

## TDD evidence

The RED suite failed before the implementation for:

- the 245-example authority matrix at the first AX mismatch;
- all nine focused territory regressions;
- possible-but-not-valid US `+12005550123` and BY `+375201234567`.

After the authority seam changed, the focused unit suite passed 27 tests. The
focused Chromium, Firefox, and WebKit browser matrices passed the AX same-value
reproduction, possible-but-not-valid US/BY replacements, and the
non-reclassification of a composing complete-field replacement.

The US and BY possible-but-not-valid examples intentionally continue through
the existing explicit-country compatibility policy after normalization. US
`200…` is accepted while its incompatible selected-country state clears; BY
`20…` is accepted while BY remains selected. Autofill does not create a second
country policy.

## Verification

Final exact-tip verification results and artifact identity are recorded in the
`mpi-q19.10` Bead handoff.
