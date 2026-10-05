# @wh1teee/mui-phone-input

Accessible international phone input for React 19 with Material UI 9 and Base
UI/shadcn renderers over one shared phone-editing engine. `libphonenumber-js` is
the only numbering authority.

- Canonical `PhoneValue` (`+digits`) separate from display formatting.
- Controlled or uncontrolled ownership, possible-by-default validation, explicit
  strict/type policies, non-geographic numbering plans.
- Searchable, responsive Country Selector with localized names, preferred and
  popular countries, and ranked calling-code search.
- Formatting modes, Display Masks, independent extensions, RFC 3966.
- Headless controller, composable primitives, MUI theme integration, server-safe
  helpers, React Hook Form and Zod adapters, metadata presets, locale packs and
  flags — each on its own entrypoint, so you install only the peers you use.

Version 1.x freezes the documented public surface.

## Install

Material UI:

```sh
pnpm add @wh1teee/mui-phone-input @mui/material@^9 @emotion/react @emotion/styled
```

Base UI or shadcn:

```sh
pnpm add @wh1teee/mui-phone-input @base-ui/react@^1.8
```

React 19 and React DOM 19 are required client peers. MUI and Emotion are needed
only by the MUI entrypoints, Base UI only by the Base UI/shadcn entrypoints;
React Hook Form and Zod only by their adapters. The `/server`, metadata, flags
and locale entrypoints need none of them.

The package is ESM only and has no published Node `engines` constraint, so
browser bundlers are never blocked. Exact tarballs are tested under Node 22 and
Node 24.

## Quick start: MUI

```tsx
'use client';

import { useState } from 'react';
import { MuiPhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input';
import '@wh1teee/mui-phone-input/flags.css';

export function PhoneField() {
  const [value, setValue] = useState<PhoneValue>();

  return (
    <MuiPhoneInput
      label="Phone number"
      defaultCountry="BY"
      value={value}
      onChange={(nextValue, details) => {
        setValue(nextValue);
        console.log(details.reason);
      }}
    />
  );
}
```

The MUI selector shows local SVG flags by default, so import
`@wh1teee/mui-phone-input/flags.css` once (or choose another `flagMode`, see
[Flags](#flags)).

## Quick start: Base UI and shadcn

```tsx
'use client';

import { useState } from 'react';
import { PhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input/shadcn';
import '@wh1teee/mui-phone-input/shadcn.css';

export function ContactPhone() {
  const [phone, setPhone] = useState<PhoneValue>();
  return (
    <PhoneInput
      label="Phone"
      name="phone"
      defaultCountry="BY"
      value={phone}
      onChange={setPhone}
      helperText="Include your country code"
    />
  );
}
```

`/base-ui` exports the identical unstyled composition; `/shadcn` is the same
code intended to be paired with the opt-in `/shadcn.css` skin. Neither imports
MUI or Emotion at runtime or in its declarations, and the MUI entrypoints do not
depend on Base UI.

The skin uses shadcn variables such as `--background`, `--input`, `--ring` and
`--popover`. Import it once in your global stylesheet location, or omit it and
style the `data-slot` attributes or `classNames` yourself. No Tailwind scanning
or Preflight is required, and CSS is never imported implicitly from JavaScript.

`PhoneInput` props:

- all controller options (`value`, `defaultValue`, `onChange`, `defaultCountry`,
  `selectedCountry`, `validationMode`, `metadata`, extension options, …);
- `label`, `helperText`, `name`, `ref`, `onBlur`, `dir`, `className`;
- `inputProps` — native attributes for the phone `<input>`;
- `classNames` — `control`, `description`, `extension`, `extensionInput`,
  `input`, `label`;
- `extensionLabel` (enables the separate extension field), `extensionHelperText`,
  `extensionInputProps`, `extensionRef`;
- `countrySelector` — selector options (see [Country Selector](#country-selector)),
  or `false` to render without the picker.

The country trigger shows the ISO code and calling code (for example `BY +375`).
`dir="rtl"` mirrors the field chrome and popup; phone digits and the extension
input always stay `dir="ltr"`.

### Dark mode and scoped themes

The popup is portaled to `document.body` by default, so CSS variables defined on
a local wrapper element are **not** inherited by it. Either define the shadcn
variables on `:root` and `.dark` (the standard shadcn setup), or render the popup
inside the themed scope:

```tsx
<PhoneInput countrySelector={{ portalContainer: scopeElement }} />
```

Pass `portalContainer: null` to defer the popup until the scope element has
mounted (for example during hydration).

Popup corners follow `--radius` but are capped at `0.75rem`, so an app whose
root `--radius` is pill-sized does not clip the list into a rounded shape. Set
`--phone-input-popup-radius` to choose the popup radius explicitly (the same cap
applies).

## Headless and application-owned fields

For an application-owned field, import `usePhoneInput` from `/headless`, spread
`phone.getInputProps()` onto your native input (it includes the engine's ref and
handlers), and pass the same `phone` to `PhoneInputCountrySelector` from
`/base-ui`:

```tsx
'use client';

import { usePhoneInput } from '@wh1teee/mui-phone-input/headless';
import { PhoneInputCountrySelector } from '@wh1teee/mui-phone-input/base-ui';

export function OwnedPhoneField() {
  const phone = usePhoneInput({ defaultCountry: 'BY' });
  return (
    <div {...phone.getRootProps()}>
      <PhoneInputCountrySelector phone={phone} />
      <input {...phone.getInputProps({ type: 'tel' })} />
    </div>
  );
}
```

Do not implement another mask or parser. `PhoneValue` is a normalized
international **candidate**, not proof that the number is valid or allocated.
It is `undefined` when empty; a string-based form can translate `undefined` to
`''` at its boundary. Normalize previously formatted values with
`parsePhoneValue`. Keep the popup in the same theme scope with
`portalContainer`.

MUI consumers can compose the same controller with MUI primitives; see
[Headless controller and primitives](#headless-controller-and-primitives).

## Country Selector

Both renderers share one country list and search authority. Configure it through
`slotProps.countrySelector` on `MuiPhoneInput`, or through the `countrySelector`
prop on the Base UI/shadcn `PhoneInput`.

### Search

The selector searches localized and English country names, ISO codes and
calling codes. Results are ranked the same way in MUI and Base UI:

1. an exact ISO code, or the main country of an exact calling code
   (`+1` → United States, `+44` → United Kingdom, `+7` → Russia);
2. other countries sharing that exact calling code;
3. prefix matches on names, ISO codes or calling codes;
4. substring matches on names.

While a query is active the results are a flat ranked list without group
headers, and the best match is highlighted so Enter selects it.

Calling-code search accepts the same ASCII, Arabic-Indic, Extended Arabic-Indic,
Devanagari and fullwidth digits as phone entry. Names come from
`Intl.DisplayNames` (or `resolveCountryName`) and match case-insensitively in
the selector locale; English fallback names use English casing.

### Preferred and popular countries

Without a query, `preferredCountries` are shown in a "Preferred countries" group
above "All countries", in the order you pass them.

`getPopularPhoneCountries(count?, { metadata? })` returns up to `count` of the
most populous countries supported by the metadata, most populous first. The
default `count` is 50, the full built-in list. Population follows official
national estimates as compiled by Wikipedia (retrieved 2026-10-04). It is
exported from the package root, `/mui`, `/headless`, `/base-ui` and `/shadcn`.

```tsx
import { getPopularPhoneCountries, MuiPhoneInput } from '@wh1teee/mui-phone-input';

<MuiPhoneInput
  slotProps={{
    countrySelector: { preferredCountries: getPopularPhoneCountries(15) },
  }}
/>;
```

```tsx
import { getPopularPhoneCountries, PhoneInput } from '@wh1teee/mui-phone-input/shadcn';

<PhoneInput countrySelector={{ preferredCountries: getPopularPhoneCountries(15) }} />;
```

Population is only a neutral default. Applications with a known audience should
pass their own list. The helper composes with `countryFilter`, `countryOrder`
and `resultLimit`.

### List size

The full country list is shown by default in both renderers. Set `resultLimit`
to cap the number of rendered options, with or without a query (MUI:
`slotProps.countrySelector.resultLimit`; Base UI/shadcn:
`countrySelector.resultLimit`). It must be a positive integer. The currently
selected country stays in the list when it matches. Earlier 1.0.x MUI releases
defaulted to 50.

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

Other shared options: `locale`, `countryFilter`, `countryOrder`,
`resolveCountryName`, `messages`, `portalContainer`.

### Keyboard and focus

After a country is chosen (click or Enter), focus moves to the phone number
input in both renderers. Escape or closing the selector returns focus to the
country trigger.

### Flags

The defaults differ by renderer:

| Renderer | Default | Change it with |
| --- | --- | --- |
| MUI | `flagMode: 'local'` (needs `@wh1teee/mui-phone-input/flags.css`) | `slotProps.countrySelector.flagMode` |
| Base UI / shadcn | no flags | `countrySelector={{ flags: { mode: 'local' } }}` |

Flag modes are `local`, `emoji`, `external` and `none`. MUI configures flags
with `flagMode`, `externalFlag` and `flagProvider`; Base UI/shadcn with
`countrySelector.flags.mode`, `.external` and `.provider`. Import the stylesheet
once when using local flags:

```ts
import '@wh1teee/mui-phone-input/flags.css';
```

Local flags are generated from pinned `country-flag-icons` `1.6.20` and stay
outside initial JavaScript. Products using `emoji`, `none`, a custom provider or
external URLs can omit the stylesheet.

External flags are opt-in and are the only built-in mode that resolves external
URLs. CORS and referrer policy are explicit, external images always load lazily,
and `fallback` accepts a React node. Without a fallback, a failed image falls
back to the country emoji:

```tsx
<MuiPhoneInput
  slotProps={{
    countrySelector: {
      flagMode: 'external',
      externalFlag: {
        crossOrigin: 'anonymous',
        fallback: '?',
        referrerPolicy: 'no-referrer',
        resolveUrl: (country) => `https://example.invalid/flags/${country}.svg`,
      },
    },
  }}
/>
```

In any other mode the flag layer does not resolve external URLs or call
fetch/XHR. Non-geographic numbering plans render no fabricated country or flag.

### Locales

Locale packs contain selector messages only. Country names still come from
`Intl.DisplayNames` (or `resolveCountryName`):

```tsx
import { be } from '@wh1teee/mui-phone-input/locales/be';

<MuiPhoneInput
  slotProps={{
    countrySelector: {
      locale: be.locale,
      messages: be.messages,
    },
  }}
/>
```

Each locale is a separate entrypoint. RTL themes mirror the selector UI while
the telephone input itself remains `dir="ltr"`.

### Presentation (MUI)

The default `mode="auto"` uses a desktop Popper and a mobile full-screen Dialog
with one shared search draft. Set `mode="desktop"` or `"mobile"` for an explicit
presentation. `portalContainer` controls the portal target and `disablePortal`
supports constrained Dialog, Drawer, BottomSheet and iOS VoiceOver layouts. The
list is non-virtualized.

### Base UI selector styling

`countrySelector.classNames` accepts `trigger`, `popup`, `positioner`, `search`,
`close`, `list`, `group`, `groupLabel`, `option`, `flag` and `empty`. The
matching `data-slot` attributes include `phone-country-trigger`,
`phone-country-popup`, `phone-country-search`, `phone-country-list`,
`phone-country-group`, `phone-country-group-label`, `phone-country-option`,
`phone-country-code`, `phone-country-name`, `phone-country-calling-code` and
`phone-country-empty`. `countrySelector.triggerProps` forwards Base UI trigger
props.

### Semantic Country Selector slots (MUI)

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
`empty` and `closeButton`. Slot-prop callbacks receive typed owner state;
prepared refs, event handlers, utility classes, state and required accessibility
props are composed by the library. The `popup` slot is the desktop popup
surface. The responsive Popper/Dialog shells, Dialog title and content,
click-away boundary, autocomplete anchor/hidden input and nested group-options
wrapper are implementation details rather than public slots. While a search
query is active the ranked results are flat, so `group` and `groupLabel` are not
rendered.

Custom component slots should forward the `ref` prop when they expose a DOM node
so consumer refs continue to resolve. The click-away boundary is owned by the
library and does not depend on a custom `popup` forwarding that ref.

### Country events and selection transactions

`onCountryChange` reports every public country transition. Its first argument
is the resolved country or `null`; details include the complete previous and
next Numbering Plan and one typed reason: `default`, `user`, `input`, `paste`,
`external-value` or `reset`. Selecting a country also commits one phone
transaction with `onChange` reason `country-selection`.

`input` covers committed keyboard, deletion, composition, replacement and
history edits. `external-value` covers controlled value/country reconciliation,
including a distinct correction when a parent rejects an optimistic user
selection.

For controlled country ownership, use `onCountrySelection` as the authoritative
user-selection stream. `onCountryChange` reports numbering-authority
transitions; those can differ from the explicit selected country while the
current digits are still incomplete or incompatible with that selection.

Country selection preserves the national digits while applying the requested
geographic calling code. Validation then reports whether the resulting draft is
possible or valid for that country. Use `onCountrySelection` or the return value
of `actions.selectCountry` to observe the exact transaction:

```tsx
<MuiPhoneInput
  onCountrySelection={(result) => {
    console.log(result.country, result.previousValue, result.value);
  }}
/>
```

`resolvePhoneCountrySelection(value, country)` exposes the same pure typed
transaction; `selectPhoneCountryValue` is a value-only wrapper. Existing
national digits are retained under the target calling code even when that draft
still needs correction, including when switching from a non-geographic/global
service number.

An unfinished international prefix is replaced rather than duplicated: selecting
Belarus from `+3` or `+37` produces `+375` with reason
`partial-calling-code-replaced`.

## Entrypoints

| Import | Contents |
| --- | --- |
| `@wh1teee/mui-phone-input`, `/mui` | `MuiPhoneInput`, primitives, controller and shared helpers |
| `/headless` | `usePhoneInput` and helpers without UI peers |
| `/base-ui`, `/shadcn` | Unstyled Base UI `PhoneInput` and `PhoneInputCountrySelector` |
| `/shadcn.css` | Optional semantic-variable skin |
| `/react-hook-form`, `/mui/react-hook-form` | MUI React Hook Form adapter |
| `/base-ui/react-hook-form`, `/shadcn/react-hook-form` | Base UI React Hook Form adapter |
| `/{mui,headless,base-ui,shadcn}/min` | Same APIs with the smaller official metadata |
| `/{mui,base-ui,shadcn}/min/react-hook-form` | Form adapters for the `/min` entrypoints |
| `/server` | Parsing, numbering-plan, formatting and validation without React |
| `/zod` | Zod schema factories |
| `/metadata/max`, `/metadata/min`, `/metadata/mobile` | Metadata presets (max is the default) |
| `/metadata/custom` | Custom-metadata validation |
| `/flags`, `/flags.css` | Flag renderer/provider types and local SVG stylesheet |
| `/locales/{en,be,ru}` | Selector message packs |
| `/package.json` | Package metadata |

## React Hook Form

```sh
pnpm add react-hook-form
```

`MuiPhoneInputController` binds the canonical `PhoneValue` through RHF's
`Controller`. An extension can be bound to a second field with `extensionName`
while both values render through one `MuiPhoneInput`.

```tsx
import type { PhoneExtension, PhoneValue } from '@wh1teee/mui-phone-input';
import { MuiPhoneInputController } from '@wh1teee/mui-phone-input/react-hook-form';
import { useForm } from 'react-hook-form';

type ContactForm = {
  extension: PhoneExtension;
  phone: PhoneValue;
};

const { control } = useForm<ContactForm>({
  defaultValues: { extension: undefined, phone: undefined },
});

<MuiPhoneInputController
  control={control}
  extensionName="extension"
  extensionPresentation="separate"
  name="phone"
/>;
```

`PhoneInputController` from `/base-ui/react-hook-form` (or the `/shadcn` alias)
accepts `name`, `control`, `rules` and optionally `extensionName`,
`extensionLabel` and `extensionRules`.

RHF remains responsible for form state and validation orchestration, so native
`Controller` behavior covers dirty/touched state, reset and async defaults,
`shouldUnregister`, field-array paths, focus-on-error, disabled fields, server
errors and leading-zero extensions. `rules` and `extensionRules` attach RHF
rules; the adapter does not create a second parsing or validation authority.

## Zod

```sh
pnpm add zod
```

```ts
import {
  createPhoneExtensionSchema,
  createPhoneFormSchema,
  createPhoneNumberTypeSchema,
  createPhonePossibleSchema,
  createPhoneSyntaxSchema,
  createPhoneValidSchema,
} from '@wh1teee/mui-phone-input/zod';

const candidate = createPhoneSyntaxSchema();
const possible = createPhonePossibleSchema({ required: true });
const strict = createPhoneValidSchema();
const mobile = createPhoneNumberTypeSchema(['MOBILE']);
const extension = createPhoneExtensionSchema({ maxLength: 6 });
const contact = createPhoneFormSchema({ phone: { required: true } });
```

`createPhoneSyntaxSchema` validates canonical `PhoneValue` syntax and does not
normalize display text. `createPhonePossibleSchema` uses the default
possible-number policy; strict validity and number-type restrictions stay
explicit. Extension schemas reuse the canonical digits-only extension parser.

## Values and ownership

`PhoneValue` is `undefined` for an empty field; otherwise a leading `+` followed
only by digits. Incomplete candidates such as `+` and `+37529` are preserved
while the user edits.

Use `value`/`onChange` for controlled ownership or `defaultValue` for
uncontrolled ownership:

```tsx
<MuiPhoneInput defaultValue="+1202" label="Phone number" />
```

Do not switch between controlled and uncontrolled ownership after mount.

## Formatting modes and Display Masks

Formatting changes only the displayed text; the canonical value remains
`+digits`. Automatic formatting is derived from `libphonenumber-js` metadata.

```tsx
<MuiPhoneInput
  displayMode="national"
  selectedCountry="US"
  value="+12025550123"
/>
// Displays: (202) 555-0123

<MuiPhoneInput
  displayMode="international-fixed-calling-code"
  selectedCountry="US"
/>
// Displays a protected +1 calling-code prefix while the canonical value is empty.
```

A declarative Display Mask adds presentation-only punctuation. `#` is a digit
slot; masks cannot inject literal digits or letters. If a mask cannot fit the
authority-formatted digits, the component falls back to automatic formatting
instead of truncating the value.

```tsx
<MuiPhoneInput
  displayMask={{ pattern: '+ # (###) ###-####' }}
  value="+12025550123"
/>
```

Advanced presentation can use a typed `FormatStrategy`. It receives the
automatic result and must return the displayed text and logical-caret
positions. The runtime rejects strategies that add, remove or reorder digits,
return an invalid caret map, or are combined with a Display Mask.

```ts
import type { FormatStrategy } from '@wh1teee/mui-phone-input';

const dotted: FormatStrategy = ({ automatic }) => ({
  displayValue: automatic.displayValue.replaceAll(' ', '.'),
  logicalCaretPositions: automatic.logicalCaretPositions,
});
```

`formatPhoneInputPresentation(value, options)` exposes the same pure client
presentation contract, including logical-to-display caret positions.

## Extensions and RFC 3966

Extensions are independent from `PhoneValue`: `undefined` when empty, otherwise
a digits-only string such as `"42"`. There is no library-wide maximum length;
opt into one with `extensionMaxLength`.

```tsx
import type { PhoneExtension, PhoneValue } from '@wh1teee/mui-phone-input';

const [value, setValue] = useState<PhoneValue>('+12025550123');
const [extension, setExtension] = useState<PhoneExtension>('42');

<MuiPhoneInput
  extension={extension}
  extensionLabel="Extension"
  extensionPresentation="separate"
  label="Phone number"
  onChange={setValue}
  onExtensionChange={setExtension}
  value={value}
/>
```

`extensionPresentation` accepts `none`, `separate`, `inline` or `custom`.
Changing presentation never creates a second extension value. The custom mode
uses `renderExtension`; MUI consumers can also replace the built-in field with
`slots.extension` and configure it through `slotProps.extension`.
`extensionError`, `extensionHelperText` and `extensionRequired` control the
extension field independently from phone-number validation.

Pasting an RFC 3966 URI or a libphonenumber-recognized value such as
`+1 202 555 0123 ext. 42` imports the number and extension in one transaction.
National extension-bearing values use the selected country as parsing context.
The resulting `PhoneValue` never contains the extension.

```ts
import { parseRfc3966, serializeRfc3966 } from '@wh1teee/mui-phone-input/server';

parseRfc3966('tel:+1-202-555-0123;ext=42');
// { value: '+12025550123', extension: '42' }

serializeRfc3966('+12025550123', '42');
// 'tel:+12025550123;ext=42'
```

The same helpers are available from the main entrypoint; use `/server` when
React or MUI must stay out of the server dependency graph.

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
it even if metadata reports its parent numbering country. Positively conflicting
shared-code digits clear the selection. Non-geographic plans expose no country.

`phone.state.selectedCountry` is the explicit country ownership state used by
the selector. It is separate from `phone.state.numberingPlan.selectedCountry`,
which is retained only while the digits remain compatible with that country.
After an explicit country click, the UI can show the requested country while
`detectedCountry`/`resolvedCountry` report numbering-authority evidence and
validation reports a draft that still needs correction.

## Validation

Validation is computed continuously but shown after blur by default. The default
policy accepts structurally possible numbers without requiring strict metadata
validity.

```tsx
<MuiPhoneInput label="Phone number" required validationMode="possible" />
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

`validationDisplay="always"` or `"never"` replaces the blur default. `onChange`
details always include the complete serializable validation result.

```ts
import {
  formatPhoneValueForDisplay,
  validatePhoneValue,
} from '@wh1teee/mui-phone-input/server';

const result = validatePhoneValue('+441481123456');
// status: 'possible', isPossible: true, isValid: false, accepted: true
```

Structural validation does not prove ownership, reachability, SMS/call delivery
or that the number exists. Use an explicit verification flow such as OTP when
the product requires those guarantees.

## Metadata presets

Max metadata is the default for client and server APIs, with
`validationMode="possible"` as the default policy. Select a smaller official
`libphonenumber-js` preset explicitly when bundle constraints justify reduced
strict-validity/type information:

```tsx
import { MuiPhoneInput } from '@wh1teee/mui-phone-input';
import minMetadata from '@wh1teee/mui-phone-input/metadata/min';

<MuiPhoneInput metadata={minMetadata} />;
```

Use the same metadata object with server helpers to keep client/server semantics
aligned:

```ts
import { validatePhoneValue } from '@wh1teee/mui-phone-input/server';
import mobileMetadata from '@wh1teee/mui-phone-input/metadata/mobile';

validatePhoneValue('+375291234567', { metadata: mobileMetadata });
```

Custom metadata must come from the official `libphonenumber-js` generator and
pass `validatePhoneMetadata()` from `@wh1teee/mui-phone-input/metadata/custom`.
Custom country tables, calling-code overrides and locally authored validity
rules are not supported.

For a bundle-sensitive client, select the renderer's `/min` path directly
instead of importing max metadata and passing another preset at runtime:

```tsx
import { PhoneInput } from '@wh1teee/mui-phone-input/shadcn/min';
import '@wh1teee/mui-phone-input/shadcn.css';
```

Measured gzip closures (Maskito, `libphonenumber-js`, `tabbable` and metadata
included; React and renderer peers excluded) are approximately 82 KiB max / 61
KiB min headless, 85 / 63 KiB Base UI, and 95 / 73 KiB MUI. Use the default max
entries when strict validity or number-type precision is product-critical.

## Headless controller and primitives

`usePhoneInput` is the same controller used by both renderers. With MUI,
compose the supported primitives without copying input, numbering or validation
semantics:

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

The controller exposes `state`, `actions`, native input refs and prop getters.
Prepared input props include the engine handlers, validation relationships and
`data-phone-input-*` state; spread the complete getter result rather than
reimplementing individual handlers.

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
under the explicit country and returns a canonical value only when it is
structurally possible. It shares the implementation used by national autofill
and returns `null` for partial, international, malformed or impossible input.
Use `parsePhoneValue` for international formatted input.

The server entrypoint imports no React, MUI, Emotion, DOM or browser globals.

## SSR and hydration

Use explicit initial values, countries, locale and placeholders when the server
and client must produce the same first render. The package does not read
`navigator`, GeoIP, storage or browser locale during server render.

No Next.js package exception is required: do not add `transpilePackages`,
`serverExternalPackages` or `optimizePackageImports` for this library. Import
browser UI from its renderer subpath in a Client Component, and neutral helpers
from `/server` in Server Components or route handlers. The packed artifact is
verified in a Next.js 16 App Router build (server vs. hydrated DOM snapshots)
and a Vite production build.

## MUI customization

The component registers `MuiPhoneInput` in the MUI theme and exposes stable
`root`, `input`, `validationMessage` and `countrySelector*` utility classes. The
exported `MuiPhoneInputOwnerState` supports owner-state-aware overrides.

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
ARIA relationships and prepared `data-phone-input-status`,
`data-phone-input-plan` and `data-phone-input-accepted` state.

Replace `slots.countrySelector` for a custom selector, or use
`slotProps.countrySelector` for locale, preferred countries, ordering,
filtering, portal policy, messages, classes and `resultLimit`. The official
slot renders inside `PhoneInputProvider` and uses the same controller as the
phone input.

## TypeScript

Source, declarations, examples and exact consumer applications are checked with
the stable native TypeScript 7 compiler.

## Reporting problems

Use the public [Q&A Discussions intake](https://github.com/wh1teee/mui-phone-input/discussions/new?category=q-a)
for bug reports and support questions.
