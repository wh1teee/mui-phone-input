# Filtered active-country presentation evidence

Date: 2026-08-04
Bead: `mpi-oan.54`

## Root cause

`PhoneInputCountrySelector` built its selectable `options` through the public
`countryFilter`, then looked up the active default, selected, or resolved country
only inside that filtered array. The phone controller retained its country, but
an excluded active country therefore produced a neutral trigger and lost its
accessible country name.

The defect came from using one collection for two different contracts:

- filtered options are selection authority;
- the active controller country is presentation authority.

## Material UI reference conclusion

The exact Material UI reference checkout was independently verified at
`cb77df2fdf6b070cd3958af0ffba11e11454bf98`.

At that revision, `useAutocomplete` labels the controlled `value` through
`getOptionLabel(value)`, while filtering, grouping, highlighting, Home/End and
arrow navigation, Enter/click selection, and `getOptionProps` are all derived
from `options` and its `filteredOptions`. A controlled presentation value that
is absent from `options` is therefore supported without becoming selectable.

Neither the assigned checkout nor the exact donor checkout had a CodeGraph
index. CodeGraph was attempted first in both locations and reported that index
creation is an owner decision, so the conclusion is based on bounded exact-source
inspection rather than semantic-graph coverage.

## Implemented policy

The selector now derives the active presentation option independently from the
controller's selected or resolved country. The consumer-filtered `options` array
is unchanged and remains the only source for search, grouping, option rendering,
keyboard navigation, and selection.

Consequently:

- an excluded active country remains visible and accurately named on the trigger;
- it is not inserted into, duplicated in, or hidden inside the option list;
- localized-name, ISO-code, and calling-code searches cannot return it;
- Arrow, Home, End, and Enter cannot reach or select it;
- tightening a filter does not mutate controlled or uncontrolled ownership;
- relaxing a filter restores the country to the selectable list exactly once.

## Regression evidence

The first public Chromium Browser Mode reproduction was RED before the source
change: a filtered uncontrolled Belarus default expected
`Select country. Belarus, BY, +375` but received only `Select country`.

Browser Mode coverage now includes:

- uncontrolled `defaultCountry`;
- controlled `selectedCountry`;
- country resolution from the current Phone Value;
- dynamic filter tightening and relaxation;
- option uniqueness and exclusion;
- localized-name, ISO-code, and calling-code search exclusion;
- Arrow/Home/End/Enter exclusion and callback cardinality;
- desktop Popper and mobile Dialog;
- portal and no-portal DOM placement;
- axe WCAG 2.2 A/AA scans;
- explicit desktop/mobile server rendering and hydration parity.

The exact packed Next.js and Vite consumers filter Belarus from the resolved
geographic fixture while requiring its trigger to remain `BY +375` and expose
the accessible name `Select country. Belarus, BY, +375`. Both latest and minimum
React 19 / Material UI 9 peer matrices consume the generated `.tgz` rather than
workspace source.

The verified source matrix contains 94 unit tests and 126 Browser Mode tests in
each of Chromium, Firefox, and WebKit.

## Package measurements

The exact package remains within its established budgets:

- main closure: 22,513 bytes gzip against 25,600;
- neutral server entry: 4,794 bytes gzip against 10,240;
- measured package tarball: 86,063 bytes.

No npm publication, deployment, push, pull request, merge, rebase, or current
Bead closure occurred.

## Discovered follow-up

`mpi-caz` records an independent mobile no-portal accessibility defect found
while exercising the matrix. With `mode="mobile"` and `disablePortal`, MUI's
Modal management can place the in-tree Dialog beneath an `aria-hidden` ancestor.
That issue is not caused by active-country filtering and is intentionally not
mixed into this isolated implementation.
