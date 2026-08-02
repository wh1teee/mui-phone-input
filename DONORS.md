# Donor baseline and capability ledger

As of **2026-08-02**, this repository contains no copied donor production code.
The executable source of truth is [`donors/manifest.json`](donors/manifest.json);
`pnpm verify:donors` checks exact revisions, licences, inspected symbols/tests,
capability decisions, and links to the local regression corpus.

## Pinned donors

| Tier | Donor | Release / revision | Licence | Use |
| --- | --- | --- | --- | --- |
| 1 | libphonenumber-js | `1.13.10` / `9758fd594a531a86e0c388da4611e30142da73b2` | MIT | Sole numbering authority |
| 1 | Maskito | `5.3.1` / `d8904823d05dbb3f9d038057634dbf98d89219e7` | Apache-2.0 | Bake-off candidate A |
| 1 | react-phone-number-input | `3.4.17` / `0408b492e99ab81c0b667cb77b24b71b0f4d8c3b` | MIT | Bake-off candidate B behavior |
| 1 | intl-tel-input | `29.1.2` / `a8ee885a28c940e1d7a2d6ca1f0f092aea0d8534` | MIT | Interaction/selector reference; globals rejected |
| 1 | Material UI | `9.2.0` / `cb77df2fdf6b070cd3958af0ffba11e11454bf98` | MIT | Public MUI contract and selector primitives |
| 1 | WAI-ARIA APG | `main@2026-08-02` / `7e4034b262bc0d25332e330d8a582aaf34113829` | W3C | Combobox/listbox/dialog semantics |
| 2 | react-international-phone | `4.8.0` / `d5789f3512753d84fa271e275f33b138e151fd66` | MIT | Composition/mask reference |
| 2 | mui-tel-input | `11.0.0` / `91f1df79c6147cd51329e8174a229c431d945b78` | MIT | MUI ergonomics reference |
| 2 | react-phone-input-2 | `2.15.1` / `b93d7b90c1c36444f55423a1bf7eca6de6a7f1b9` | MIT | Legacy behavior; tables rejected |
| 2 | react-phone-input-material-ui | `3.0.0` / `dc8e0155b01fe810d526cbc00a48cc23aedf91b4` | MIT | Shallow adapter reference only |
| 2 | IMask | `7.6.1` / `a02a14b642f70b335e24789e8a187857473a21a5` | MIT | Positional mask concepts |
| 2 | country-flag-icons | `1.6.20` / `3b8ea50f08ab9d5e79c90325ff76606a4258a719` | MIT | Local flag option |
| 2 | typesnippet/mui-phone-input | `0.1.6` / `ddba5c7ff9e3931a828fe247159f96ac25b68cd6` | MIT | Naming/ergonomics comparison |
| 2 | Christofle | internal / `e3d8561b0117a629e1cd6025148ef4370e8cd87e` | internal | Migration scenarios only |

The Christofle checkout was read-only and contained unrelated dirty files. The
phone surfaces inspected at that revision were the account `PhoneField` family
(`window.intlTelInputUtils`, `/utils.min.js`, direct `value` and
`setSelectionRange` mutation) and the checkout `PhoneFieldCountry` family
(`COUNTRIES`, `getPhoneCountry`, duplicated selector/validation semantics).

## Capability decisions

### `cap-numbering-authority`

Adapt only the public `libphonenumber-js` API. Parsing, calling codes,
geographic/non-geographic plans, possibility, validity, and number type may not
come from donor tables or masks.

`mpi-oan.4` implements this boundary with `AsYouType`,
`PhoneNumber.getPossibleCountries()`, `getCountries`, `getCountryCallingCode`,
and `isSupportedCountry` from `libphonenumber-js@1.13.10`. Possible Countries
are broad while a shared calling code is unresolved and narrow when authority
data identifies a smaller candidate set. No manual country or calling-code
table is present.

`mpi-oan.10` extends the same authority boundary with
`validatePhoneNumberLength`, `PhoneNumber.isPossible`, `PhoneNumber.isValid`,
`PhoneNumber.getType`, and `formatIncompletePhoneNumber`. Possible validation
is the default acceptance policy; strict validity and number-type restrictions
remain explicit. Structural metadata results never claim ownership or
deliverability.

## MUI composition boundary

`mpi-oan.6` adopts Material UI 9.2 component conventions rather than exposing
an opaque visual wrapper. The implementation follows `TextField`,
`useDefaultProps`, `styled`, `mergeSlotProps`, `useForkRef`, utility-class,
theme-augmentation, slot and owner-state patterns. React 19 context and ref
composition are used by the supported primitives. Telephone semantics remain
inside the shared package controller and are not delegated to visual slots.

### `cap-input-transaction-engine`

`mpi-oan.22` selected **Maskito core/React 5.3.1** as the Input Transaction
foundation. The shared candidate corpus passed in Chromium 151, Firefox 153,
and WebKit 26.5. Maskito advanced the semantic caret for middle insertion and
required no package-owned direct DOM mutation. The internal
`react-phone-number-input`/`input-format` adaptation was smaller and faster in
the pure transform benchmark, but left the caret at its pre-insert position in
all three browsers and required direct `value`/selection mutation.

The package-owned Maskito wrapper retains explicit regression coverage for
transaction coalescing, raw clipboard context, composition buffering, and
semantic deletion next to separators. `@maskito/phone` remains a bake-off
helper and behavior reference; it is not a second phone-number authority.

Runtime dependencies are `@maskito/core@5.3.1` and
`@maskito/react@5.3.1`. Apache-2.0 attribution is shipped in
`THIRD_PARTY_NOTICES.md`. No input-format or react-phone-number-input source is
copied. Physical Android/iOS input evidence remains correctly deferred to
`mpi-oan.24`.

### `cap-country-selector`

Use MUI `useAutocomplete`/Popper/Dialog primitives and WAI-ARIA APG semantics.
intl-tel-input and react-international-phone are pattern references only; their
country data is not authority.

### `cap-mui-contract`

Follow MUI theme augmentation, utility classes, `ownerState`, slots, and
`slotProps` directly. mui-tel-input and typesnippet are naming comparisons, not
source donors.

### `cap-display-masks`

Use `AsYouType` as the baseline. IMask and react-international-phone contribute
positional-mapping concepts only. A display mask never validates or mutates
Phone Value.

### `cap-flags`

Local flags or a user-supplied renderer are permitted. External loading is
opt-in. A non-geographic plan receives no country or flag.

### `cap-legacy-country-tables`

Reject react-phone-input-2 and Christofle manual country/calling-code tables.

### `cap-legacy-dom-mutation`

Reject direct input value/caret mutation and global phone utility scripts.

### `cap-christofle-parity`

Preserve address-country synchronization, example placeholders, unified-field
appearance, and modal behavior through the package API/theme/slots while
removing both legacy authority families during the gated Christofle phase.

## Regression corpus

- `tests/corpus/input-transactions.ts` covers editing, selection, paste,
  autofill, predictive input, IME, Unicode digits, controlled updates,
  locale/mask/country changes, fixed calling code, undo/redo, Strict Mode, MUI,
  SSR/hydration, refs, RHF reset, shared calling codes, and non-geographic plans.
- `tests/corpus/country-selector.ts` covers localized/ISO/calling-code search,
  preferred countries, keyboard semantics, mobile Dialog, and iOS no-portal
  VoiceOver mode.
- `tests/corpus/christofle.ts` captures the exact account and checkout parity
  obligations and legacy-authority removal.
- `tests/model/input-transaction-model.ts` defines the model commands and the
  ten required invariants. `tests/bakeoff/adapter-contract.ts` is the shared
  seam for both `mpi-oan.22` candidates.

Any future copied or adapted code must add exact source symbols, retained tests,
licence/attribution action, and local regression IDs before CI can pass.
