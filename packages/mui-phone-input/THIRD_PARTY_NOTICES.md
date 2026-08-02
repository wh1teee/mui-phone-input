# Third-party notices

## Maskito

The package uses `@maskito/core` and `@maskito/react` version `5.3.1` as its
browser Input Transaction foundation.

Maskito is Copyright © Taiga UI contributors and is distributed under the
Apache License, Version 2.0. The dependency packages retain their own licence
files and notices in their npm distributions.

Source inspected for the 1.0 engine decision:

- <https://github.com/taiga-family/maskito>
- revision `d8904823d05dbb3f9d038057634dbf98d89219e7`

No Maskito source code is copied into this package.

## libphonenumber-js

The package uses `libphonenumber-js@1.13.10` as its only phone-numbering
authority. It provides parsing, country calling codes, geographic and
non-geographic numbering-plan metadata, country detection, and the source data
for Possible Countries, possibility, strict validity, number type, typed length
reasons, and deterministic international formatting.

libphonenumber-js is Copyright © Nikolay Kuchumov and is distributed under the
MIT licence. Source inspected for the 1.0 authority contract:

- <https://gitlab.com/catamphetamine/libphonenumber-js>
- revision `9758fd594a531a86e0c388da4611e30142da73b2`

No manual country or calling-code table is maintained by this package.

## input-format and react-phone-number-input

`input-format@0.3.14` and `react-phone-number-input@3.4.17` were inspected and
used only in the development bake-off. They are not runtime dependencies and
their source code is not copied into the package.

Both projects are distributed under the MIT licence. Exact revisions and the
capability decision are recorded in the repository `DONORS.md` and
`donors/manifest.json` files.
