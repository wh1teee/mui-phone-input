# Partial international-prefix evidence

Date: 2026-08-03
Bead: `mpi-oan.39`

## Root cause

Before this slice, country selection treated every digit as a national draft
whenever Numbering Plan Resolution had not yet recognized a complete calling
code. Values such as `+3` and `+37` were therefore appended to the selected
Belarus calling code as `+3753` and `+37537`.

## Authority classification

The transaction builds one immutable calling-code list from the geographic
and non-geographic keys in pinned `libphonenumber-js@1.13.10` max metadata.
A value is a partial international prefix only when:

- no complete calling code is currently recognized;
- at least one digit follows `+`;
- an authority calling code is strictly longer and starts with those digits.

No handwritten prefix table or country exception is introduced. Once a
complete calling code is recognized, remaining digits keep their existing
national-draft semantics.

## Public transaction

`resolvePhoneCountrySelection('+3', 'BY')` and
`resolvePhoneCountrySelection('+37', 'BY')` return one applied result:

- `value` and `candidateValue`: `+375`;
- reason: `partial-calling-code-replaced`;
- previous value retained in the result;
- complete previous and next Numbering Plans.

Empty values still initialize the selected calling code. Complete `+375` and
`+37529` values remain unchanged. The lossless conflicts introduced by
`mpi-oan.30` remain unchanged.

## Browser and packed-package proof

Real Browser Mode starts from `+37`, selects Belarus through the public action,
commits `+375` exactly once, and emits one typed selection result.

Production Next.js and Vite consumers install the exact `.tgz`, enter `+37`,
select Belarus through the built-in Country Selector, and assert the same
value, callback cardinality, and reason. Package verification checks the pure
resolver, compatibility helper, and generated reason union.
