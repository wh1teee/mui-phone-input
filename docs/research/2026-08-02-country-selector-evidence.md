# Basic responsive Country Selector evidence

Date: 2026-08-02
Bead: `mpi-oan.5`

## Authority and data contract

Country identity and calling codes come only from `libphonenumber-js/max`
through `getCountries`, `getCountryCallingCode`, `isSupportedCountry`, and the
existing Numbering Plan Resolution authority. No donor or manually maintained
country/calling-code table is shipped.

`createPhoneCountryOptions` resolves localized names with `Intl.DisplayNames`
and always retains an English name for search. Consumers may supply a typed
name resolver, country filter, preferred-country list, and ordering function.
Preferred countries are deduplicated and occur once in the complete list.

`filterPhoneCountryOptions` searches localized name, English name, ISO code,
and calling code, with or without a leading plus. Standard rendering is bounded
to 50 results by default while retaining the active country. No virtualization
runtime or peer dependency was added; measured virtualization remains owned by
`mpi-oan.23`.

## One phone and country transaction model

`usePhoneInput` now owns controlled or uncontrolled country state through
`selectedCountry` or `defaultCountry`, with the same fixed-at-mount ownership
rules as Phone Value. The public controller exposes `actions.selectCountry`.

Country selection:

- replaces the authority-backed calling code while preserving compatible
  national digits;
- falls back to the selected calling code when the carried digits conflict;
- emits at most one `onChange` with reason `country-selection`;
- emits deterministic `onCountryChange` details only when the selected country
  changes;
- updates numbering-plan and validation details in the same transaction;
- restores the initial country and value coherently on uncontrolled reset.

The default `MuiPhoneInput` and `PhoneInputCountrySelector` composable primitive
consume this exact controller. No second country or phone-value state machine
exists.

## Responsive and portal contract

The selector uses MUI 9 `useAutocomplete` listbox/combobox semantics. Desktop
renders in `Popper`; mobile renders in a full-screen `Dialog`. `open` and the
search draft remain shared when presentation changes, and selection/dismissal
returns focus to the trigger.

`portalContainer` and `disablePortal` are explicit. Browser proof covers the
page default portal, an explicit container, and no-portal use inside Dialog,
Drawer, and BottomSheet-shaped contexts. The same no-portal path passes WebKit
automation; physical iOS VoiceOver proof remains the correctly recorded
real-device gate rather than being inferred from headless WebKit.

## Accessibility and MUI contract

Automated browser evidence covers:

- labelled trigger, search combobox, listbox, groups, options, and mobile
  Dialog;
- `aria-expanded`, `aria-controls`, `aria-haspopup`, and active-descendant
  behavior;
- Arrow/Home/End navigation, Enter commit, Escape dismissal, active-option
  visibility, and focus return;
- stable selector utility classes plus consumer `classes` propagation to
  trigger, popup, search, listbox, options, groups, labels, and empty state;
- disabled/read-only behavior inherited from the shared phone controller.

Manual VoiceOver/Safari, NVDA/Firefox, and JAWS/Chrome release evidence remains
part of the later WCAG/real-device gates; this bead establishes the automated
screen-reader semantic baseline without claiming those manual gates.

## Exact package evidence

Production Next.js and Vite consumers install the exact generated `.tgz` and
exercise both the built-in selector and the composable selector primitive.
Latest React 19.2/MUI 9.2 and minimum React 19.0/MUI 9.0 matrices pass.

The source suites contain 62 Browser Mode tests per engine and 81 unit tests.
All Browser Mode tests pass in Chromium, Firefox, and WebKit.

Current exact-artifact measurements remain within the established budgets:

- main closure: 15,375 bytes gzip;
- server entry: 2,915 bytes gzip;
- packed tarball: 57,353 bytes.

No package was published. npm identity and publication remain behind the owner
gate `mpi-g7a`.
