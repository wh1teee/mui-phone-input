# @wh1teee/mui-phone-input

Modern React 19 and Material UI 9 phone input. The current prerelease tracer
provides a canonical international candidate, controlled and uncontrolled
ownership, authority-backed numbering-plan resolution, possible-by-default
validation, a shared headless controller, supported composable primitives, MUI
theme registration, a searchable responsive Country Selector, stable utility
classes, and deterministic event-independent change details.

The package is still under active 1.0 development. Advanced display modes and
masks, extensions, packaged locale/flag modes, and form adapters are delivered
in later gated slices.

## Published subpaths

The current canary publishes only these implemented paths:

- `@wh1teee/mui-phone-input` — React/MUI component, controller, primitives and
  shared phone helpers;
- `@wh1teee/mui-phone-input/server` — neutral parsing, numbering-plan,
  formatting and validation helpers;
- `@wh1teee/mui-phone-input/metadata/max` — max metadata (the default);
- `@wh1teee/mui-phone-input/metadata/min` — min metadata;
- `@wh1teee/mui-phone-input/metadata/mobile` — mobile metadata;
- `@wh1teee/mui-phone-input/metadata/custom` — custom-metadata validation;
- `@wh1teee/mui-phone-input/package.json` — package metadata.

The following future paths are intentionally not exported until their owning
feature ships atomically with implementation, documentation, tests and release
evidence:

- `./react-hook-form` and `./zod` (`mpi-oan.12`);
- `./flags/local` and `./locales/en` (`mpi-oan.11`).

React Hook Form and Zod remain optional peer declarations so their owning
adapter slice can preserve the planned package contract without forcing either
dependency into current consumers. They are not required to install or use the
implemented canary paths.

## Reporting problems

Use the public [Q&A intake](https://github.com/wh1teee/mui-phone-input/discussions/new?category=q-a)
for bug reports and support questions. Maintainers transfer actionable reports
to the canonical Beads/Dolt tracker and reply with the Bead ID; GitHub
Discussions do not carry implementation status.

## Install

```sh
pnpm add @wh1teee/mui-phone-input @mui/material @emotion/react @emotion/styled
```

React 19, React DOM 19, and MUI 9 are peer dependencies. The package is ESM
only and intentionally has no published Node engine constraint, so browser
consumers are not blocked by the repository toolchain. Exact tarballs are
installed and loaded under Node 22 and Node 24; repository development and
release tooling requires Node 24 LTS.

## Controlled usage

```tsx
'use client';

import { MuiPhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input';
import { useState } from 'react';

export function PhoneField() {
  const [value, setValue] = useState<PhoneValue>();

  return (
    <MuiPhoneInput
      label="Phone number"
      selectedCountry="BY"
      value={value}
      onChange={(nextValue, details) => {
        setValue(nextValue);
        console.log(details.reason);
      }}
    />
  );
}
```

`PhoneValue` is `undefined` for an empty field. Otherwise it is a leading `+`
followed only by digits. Incomplete candidates such as `+` and `+37529` are
preserved while the user edits.

## Uncontrolled usage

```tsx
<MuiPhoneInput defaultValue="+1202" label="Phone number" />
```

Do not switch between controlled and uncontrolled ownership after mount.

## Country Selector

The built-in selector searches localized and English country names, ISO codes,
and calling codes. Country/calling-code authority comes from
`libphonenumber-js`; names default to `Intl.DisplayNames`. Calling-code search
accepts the same ASCII, Arabic-Indic, Extended Arabic-Indic, Devanagari, and
fullwidth decimal digits as phone entry. Localized names use the selector
locale for case-insensitive matching, while English fallback names keep stable
English casing semantics.

```tsx
<MuiPhoneInput
  defaultCountry="BY"
  label="Phone number"
  slotProps={{
    countrySelector: {
      locale: 'be',
      preferredCountries: ['BY', 'PL', 'LT'],
      resultLimit: 50,
    },
  }}
/>
```

`onCountryChange` reports every public country transition. Its first argument
is the resolved country or `null`; details include the complete previous and
next Numbering Plan and one typed reason: `default`, `user`, `input`, `paste`,
`external-value`, or `reset`. Selecting a country also commits one phone
transaction with `onChange` reason `country-selection`.

`input` covers committed keyboard, deletion, composition, replacement, and
history edits. `external-value` covers controlled value/country reconciliation,
including a distinct correction when a parent rejects an optimistic user
selection.

For controlled country ownership, treat `onCountryChange` as a transition
stream rather than an unconditional setter. Update `selectedCountry` for
`reason === 'user'` from `details.numberingPlan.selectedCountry`; automatic
detected/resolved transitions remain observable without overwriting explicit
ownership.

Country selection is lossless. Use `onCountrySelection` or the return value of
`actions.selectCountry` to observe whether the request was applied or conflicted:

```tsx
<MuiPhoneInput
  onCountrySelection={(result) => {
    if (result.status === 'conflict') {
      console.log(result.reason, result.previousValue, result.candidateValue);
    }
  }}
/>
```

`resolvePhoneCountrySelection(value, country)` exposes the same pure typed
transaction. `selectPhoneCountryValue` remains a value-only wrapper. Compatible
national digits are retained; an incompatible or non-geographic draft remains
unchanged instead of collapsing to the target calling code.

An unfinished international prefix is replaced rather than duplicated. For
example, selecting Belarus from `+3` or `+37` produces `+375` with reason
`partial-calling-code-replaced`. Complete calling codes and their national
digits keep the normal preservation rules.

The default `mode="auto"` uses a desktop Popper and a mobile full-screen Dialog
with one shared search draft. Set `mode="desktop"` or `"mobile"` for an explicit
presentation. `portalContainer` controls the portal target and `disablePortal`
supports constrained Dialog, Drawer, BottomSheet, and iOS VoiceOver layouts.
The standard list is bounded and non-virtualized; optional virtualization is a
later measured capability, not a runtime dependency.

### Semantic Country Selector slots

Customize one semantic part without replacing the selector state machine:

```tsx
import type {
  PhoneCountrySelectorOptionOwnerState,
  PhoneCountrySelectorSlots,
} from '@wh1teee/mui-phone-input';
import type { ComponentPropsWithRef } from 'react';

function CountryOption({
  ownerState,
  ...props
}: ComponentPropsWithRef<'li'> & {
  ownerState: PhoneCountrySelectorOptionOwnerState;
}) {
  return <li {...props} data-country={ownerState.option.country} />;
}

const selectorSlots = {
  option: CountryOption,
} satisfies PhoneCountrySelectorSlots;

<MuiPhoneInput
  slotProps={{
    countrySelector: {
      slots: selectorSlots,
      slotProps: {
        option: (ownerState) => ({
          'data-selected': ownerState.selected,
        }),
      },
    },
  }}
/>
```

The stable semantic slots are `trigger`, `popup`, `searchInput`, `listbox`,
`group`, `groupLabel`, `option`, `optionLabel`, `countryCode`, `callingCode`,
`empty`, and `closeButton`. Slot-prop callbacks receive typed owner state;
prepared refs, event handlers, utility classes, state, and required
accessibility props are composed by the library. The `popup` slot is the
desktop popup surface. The responsive Popper/Dialog shells, Dialog title and
content, click-away boundary, autocomplete anchor/hidden input, and nested
group-options wrapper are implementation details rather than public slots.
Flag and loading slots will be added only with those capabilities rather than
published as empty speculative API.

Custom component slots should forward the `ref` prop when they expose a DOM
node so consumer refs continue to resolve. The desktop click-away boundary is
owned by the library and does not depend on the custom `popup` forwarding that
ref, so a plain function popup cannot disable dismissal accidentally.

## Numbering-plan resolution

```ts
import { resolveNumberingPlan } from '@wh1teee/mui-phone-input/server';

const plan = resolveNumberingPlan('+12025550123', {
  selectedCountry: 'CA',
});

// {
//   kind: 'geographic',
//   countryCallingCode: '1',
//   selectedCountry: null,
//   detectedCountry: 'US',
//   resolvedCountry: 'US',
//   possibleCountries: ['US']
// }
```

Shared calling codes remain unresolved until authority data or a compatible
explicit selection resolves them. While unresolved, `possibleCountries`
contains every authority-backed country for the calling code; once digits
narrow the plan, the list narrows with `PhoneNumber.getPossibleCountries()`.
An explicit territory remains selected when the complete number is valid for
that territory even if metadata reports its parent numbering country as the
detected label. Positively conflicting shared-code digits still clear the
selection. Non-geographic plans expose no country.

## Validation

Validation is computed continuously but shown after blur by default. The
default policy accepts structurally possible numbers without requiring strict
metadata validity.

```tsx
<MuiPhoneInput
  label="Phone number"
  required
  validationMode="possible"
/>
```

Strict validity and type restrictions are explicit:

```tsx
<MuiPhoneInput validationMode="valid" />

<MuiPhoneInput
  validationMode="possible-and-type"
  allowedNumberTypes={['MOBILE', 'FIXED_LINE_OR_MOBILE']}
  validationMessage="Use a mobile number."
/>
```

Use `validationDisplay="always"` or `"never"` to replace blur-default
presentation. `onChange` details always include the complete serializable
validation result regardless of display policy.

For server or non-MUI boundaries:

```ts
import {
  formatPhoneValueForDisplay,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';

const result = validatePhoneValue('+441481123456');
// status: 'possible', isPossible: true, isValid: false, accepted: true
```

Structural validation does not prove ownership, reachability, SMS/call
delivery, or that the number exists. Use an explicit verification flow such as
OTP when the product requires those guarantees.

## Metadata presets

Max metadata remains the default for both client and server APIs while
`validationMode="possible"` remains the default acceptance policy. Select a
smaller official `libphonenumber-js` preset explicitly when bundle or runtime
constraints justify the reduced strict-validity/type information:

```tsx
import { MuiPhoneInput } from '@wh1teee/mui-phone-input';
import minMetadata from '@wh1teee/mui-phone-input/metadata/min';

<MuiPhoneInput metadata={minMetadata} />;
```

Use the same metadata object with server helpers to preserve client/server
semantics:

```ts
import { validatePhoneValue } from '@wh1teee/mui-phone-input/server';
import mobileMetadata from '@wh1teee/mui-phone-input/metadata/mobile';

validatePhoneValue('+375291234567', { metadata: mobileMetadata });
```

Custom metadata must come from the official `libphonenumber-js` metadata
generator and pass `validatePhoneMetadata()` from
`@wh1teee/mui-phone-input/metadata/custom` before use. Custom country tables,
calling-code overrides, and locally authored validity/type rules are not a
supported numbering authority.

## Headless controller and primitives

`usePhoneInput` is the same controller used by `MuiPhoneInput`. Advanced
consumers can compose supported primitives without copying input, numbering or
validation semantics.

```tsx
'use client';

import {
  PhoneInputInput,
  PhoneInputCountrySelector,
  PhoneInputProvider,
  PhoneInputRoot,
  PhoneInputValidationMessage,
  usePhoneInput,
} from '@wh1teee/mui-phone-input';

function ComposablePhoneInput() {
  const phone = usePhoneInput({ defaultValue: '+1', required: true });

  return (
    <PhoneInputProvider value={phone}>
      <PhoneInputRoot>
        <label htmlFor={phone.state.inputId}>Phone number</label>
        <PhoneInputCountrySelector preferredCountries={['BY', 'US']} />
        <PhoneInputInput />
        <PhoneInputValidationMessage />
      </PhoneInputRoot>
      <button onClick={phone.actions.clear} type="button">
        Clear
      </button>
    </PhoneInputProvider>
  );
}
```

The controller exposes `state`, `actions`, native input refs, and prop getters
for custom composition. Prepared input props include the engine handlers,
validation relationships and `data-phone-input-*` state. Consumers should
spread the complete getter result rather than reimplementing individual
handlers.

## Server-safe helpers

```ts
import {
  assertPhoneValue,
  formatPhoneValueForDisplay,
  isPhoneValue,
  parseNationalPhoneValue,
  parsePhoneValue,
  resolveNumberingPlan,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';

const passengerPhone = parseNationalPhoneValue('8 (029) 123-45-67', 'BY');
// '+375291234567'
```

`parseNationalPhoneValue(input, country)` accepts one complete national number
under the explicit country authority and returns a canonical Phone Value only
when the result is structurally possible. It shares the same metadata-backed
implementation used by complete-field national autofill, including territory
identity and possible-by-default semantics. It returns `null` for partial,
international, malformed, or structurally impossible input. Use
`parsePhoneValue` for already international formatted input.

The server entrypoint imports no React, MUI, Emotion, DOM, or browser globals.

## SSR and hydration

Use explicit initial values, countries, locale and placeholders when the server
and client must produce the same first render. The package does not read
`navigator`, GeoIP, storage or browser locale during server render.

The release verifier installs the exact `.tgz` in a Next.js App Router
application and compares semantic snapshots from JavaScript-disabled server
output and the post-hydration DOM for empty, geographic, unresolved shared-code
and non-geographic states. The same tarball is production-built and exercised
in Vite. Import pure helpers from `@wh1teee/mui-phone-input/server`; that entry
contains no MUI or React component graph.

## MUI customization

The component registers `MuiPhoneInput` in the MUI theme and exposes stable
`root`, `input`, `validationMessage`, and `countrySelector*` utility classes.
The exported `MuiPhoneInputOwnerState` supports owner-state-aware overrides.

```ts
const theme = createTheme({
  components: {
    MuiPhoneInput: {
      defaultProps: { fullWidth: true },
      styleOverrides: {
        root: { minWidth: 240 },
        input: { fontVariantNumeric: 'tabular-nums' },
        countrySelectorOption: { minHeight: 44 },
        validationMessage: { fontWeight: 600 },
      },
      variants: [
        {
          props: { required: true },
          style: { outlineOffset: 2 },
        },
      ],
    },
  },
});
```

`MuiPhoneInput` inherits Material UI `TextField` `slots` and `slotProps`. A
custom `htmlInput` slot receives the native ref, composed events, utility class,
ARIA relationships, and prepared `data-phone-input-status`,
`data-phone-input-plan`, and `data-phone-input-accepted` state.

Replace `slots.countrySelector` for a custom selector implementation or use
`slotProps.countrySelector` for locale, preferred countries, ordering, filtering,
portal policy, messages, classes, and result bounds. The official slot renders
inside `PhoneInputProvider` and uses the same controller as the phone input.
