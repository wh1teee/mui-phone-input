# Country Selector semantic-slot evidence

Date: 2026-08-03
Bead: `mpi-oan.35`

## Supported boundary

`PhoneInputCountrySelector` now owns a nested MUI-style `slots` and `slotProps`
contract. `MuiPhoneInput` exposes the same contract through
`slotProps.countrySelector`, so replacing one selector part does not require a
second controller, search model, country transaction, focus model, or
accessibility implementation.

The stable semantic slots are:

- `trigger`;
- desktop `popup` surface;
- `searchInput`;
- `listbox`;
- `group` and `groupLabel`;
- `option` and `optionLabel`;
- `countryCode` and `callingCode` indicators;
- `empty` state;
- mobile `closeButton`.

Each slot has a stable utility class and typed owner state. Shared selector
owner state includes the `MuiPhoneInputOwnerState` fields plus `open`, `query`,
and `presentation`. Group, option, and indicator slots receive only their
additional semantic data: group label/preferred state, option/selected state,
or option/placement state.

## Prepared behavior

External slot props and handlers are composed before the prepared library
behavior. Required relationships are reapplied after merging so a cosmetic
replacement cannot silently remove:

- trigger expansion, popup relation, disabled/read-only state, or trigger ref;
- combobox ID, role, active descendant, controlled value, or autocomplete ref;
- listbox ID, role, and MUI listbox ref;
- group label IDs and option role, ID, selection, index, or accessible name;
- polite empty-state announcement;
- mobile close accessible name, focus-cycle ref, close behavior, or focus
  return;
- the popup marker used by portal-safe keyboard traversal.

The desktop ClickAwayListener owns a private DOM boundary outside the public
`popup` slot. A plain function popup that ignores its React 19 `ref` prop does
not break outside-click dismissal. Custom components should still forward refs
when consumers expect their own slot ref to resolve.

Consumer refs are forked with the controller and MUI refs. Consumer event
handlers still run and can observe the same transaction. Trigger cancellation
retains the existing explicit `preventDefault()` contract; selecting an option
continues through the authoritative `actions.selectCountry` transaction.

## Private implementation details

The desktop Popper and mobile Dialog shell remain responsive implementation
details. Dialog title/content, ClickAwayListener, the autocomplete root and
hidden input, and the nested group-options list are not public slots. This
keeps presentation and MUI internals replaceable without breaking the stable
semantic API.

Flag, loading, and virtualization slots are intentionally absent until their
capabilities are implemented and evidenced. The API does not publish inert
speculative boundaries.

## Executable proof

Browser Mode covers a fully custom semantic selector on the production
`MuiPhoneInput` controller, including owner-state callbacks, composed trigger
and search refs, protected ARIA/roles, group and option replacement, composed
option selection, indicator slots, and custom empty state. A separate mobile
case proves the custom close slot, protected accessible name, composed click,
Dialog dismissal, and trigger focus return.

The MUI theme/type suite proves nested selector slots in `defaultProps`,
owner-state slot-prop callbacks, and stable style-override/class keys. Existing
keyboard, responsive, portal, hydration, and axe suites continue to exercise
the default implementation.

The exact-tip source matrix contains 98 Browser Mode tests per engine and 86
unit/model tests. The selector file, including both semantic-slot cases, passes
in Chromium, Firefox, and WebKit. Exact package measurements remain within the
established budgets:

- main closure: 18,692 bytes gzip;
- server entry: 2,915 bytes gzip;
- packed tarball: 72,958 bytes.
