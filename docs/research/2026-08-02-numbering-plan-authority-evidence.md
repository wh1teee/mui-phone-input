# Numbering-plan authority evidence

Date: 2026-08-02
Bead: `mpi-oan.4`

## Public model

`resolveNumberingPlan(value, options)` is exported from both the client and
server entrypoints. It returns a serializable discriminated union:

- `geographic`;
- `non-geographic`;
- `unresolved`.

Every result exposes:

- `countryCallingCode`;
- `selectedCountry`;
- `detectedCountry`;
- `resolvedCountry`;
- `possibleCountries`.

`MuiPhoneInput` accepts an optional `selectedCountry` context and includes the
same resolution in every committed change detail. Changing an external value
or selected-country context does not emit a user-change callback.

## Authority boundary

`libphonenumber-js@1.13.10` is the only numbering authority.

- `AsYouType` supplies the recognized calling code and detected country.
- `PhoneNumber.getPossibleCountries()` narrows resolved shared-code candidates.
- `getCountries()` and `getCountryCallingCode()` provide the broad unresolved
  fallback directly from pinned metadata.
- `isSupportedCountry()` validates explicit configuration.

The package contains no handwritten country/calling-code table and no
independent leading-digit rule. A recognized calling code with no country list
is represented as a non-geographic plan.

## Shared-code policy

An explicit selected country remains authoritative while compatible with the
current calling code and detected country. It is cleared only when authority
data identifies another country or calling code.

Regression evidence includes:

- NANP `+1`, CA selection, and US/CA detection;
- `+7`, KZ selection, and RU/KZ detection;
- `+44`, GB/GG/IM/JE Possible Countries and territory detection;
- Belarus `+375` as a single-country plan;
- non-geographic `+800` and `+870` without a fabricated country.

Incomplete shared codes remain unresolved without explicit selection. Empty
and partial values can still use a compatible selected country as input
context.

## Client/server and browser evidence

Unit and property tests require client/server parity and verify that every
Possible Country maps back to the result calling code through
`libphonenumber-js`.

Browser tests cover:

- selected CA remaining authoritative at `+1`;
- transition to detected US after sufficient digits;
- selected country removal for a non-geographic plan;
- formatted paste resolving immediately;
- external controlled US values causing no callback loop and the next user
  transaction using fresh resolution state.

Packed Next.js and Vite consumers assert the exact tarball callback details for
single-country Belarus, unresolved `+1` with all 25 NANP candidates, resolved
US with `possibleCountries = ['US']`, and non-geographic `+800` without any
country. Latest and minimum React/MUI matrices use the same browser flow.

## Scope boundary

This Bead resolves numbering plans only. Possibility, validity, number type,
typed validation reasons, selector UI, country-change callbacks, metadata
variants, and validation policy remain owned by later Beads.
