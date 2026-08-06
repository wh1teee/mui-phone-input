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

The package uses the exact `libphonenumber-js` version pinned in its package
manifest as its only phone-numbering authority. It provides parsing, country
calling codes, geographic and non-geographic numbering-plan metadata, country
detection, and the source data for Possible Countries, possibility, strict
validity, number type, typed length reasons, and deterministic international
formatting.

libphonenumber-js is Copyright © Nikolay Kuchumov and is distributed under the
MIT licence. Source inspected for the 1.0 authority contract:

- <https://gitlab.com/catamphetamine/libphonenumber-js>
- revision `9758fd594a531a86e0c388da4611e30142da73b2`

No manual country or calling-code table is maintained by this package.

## country-flag-icons

The package copies the generated 3x2 SVG flag assets from
`country-flag-icons@1.6.20` into its published `flags.css`/`flags/3x2` asset
surface. The source project is:

- <https://gitlab.com/catamphetamine/country-flag-icons>

`country-flag-icons` is distributed under the MIT License:

Copyright (c) 2020 @catamphetamine <purecatamphetamine@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## tabbable

The package uses `tabbable@6.5.0` to resolve the browser's sequential focus
order when a portaled desktop Country Selector closes on Tab or Shift+Tab.
The dependency covers native focus targets including contenteditable,
details/summary, media controls, radio groups, positive tab order, inert
subtrees, and open shadow roots.

tabbable is Copyright © David Clark and contributors and is distributed under
the MIT licence. Source inspected for the focus-navigation contract:

- <https://github.com/focus-trap/tabbable>
- revision `7dbb9e9bf1636b02c2fc6955f0719648bb465743`

No tabbable source code is copied into this package.

## input-format and react-phone-number-input

`input-format@0.3.14` and `react-phone-number-input@3.4.17` were inspected and
used only in the development bake-off. They are not runtime dependencies and
their source code is not copied into the package.

Both projects are distributed under the MIT licence. Exact revisions and the
capability decision are recorded in the repository `DONORS.md` and
`donors/manifest.json` files.
