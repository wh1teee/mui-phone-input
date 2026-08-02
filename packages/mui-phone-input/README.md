# @whiteee/mui-phone-input

Modern React 19 and Material UI 9 phone input. The current prerelease tracer
provides a canonical international candidate, controlled and uncontrolled
ownership, authority-backed numbering-plan resolution, possible-by-default
validation, MUI theme registration, stable utility classes, and deterministic
event-independent change details.

The package is still under active 1.0 development. Country selection, advanced
display modes/masks, extensions, locales, flags, metadata variants, and form
adapters are delivered in later gated slices.

## Install

```sh
pnpm add @whiteee/mui-phone-input @mui/material @emotion/react @emotion/styled
```

React 19, React DOM 19, and MUI 9 are peer dependencies. The package is ESM
only and requires Node 24+ for tooling.

## Controlled usage

```tsx
'use client';

import { MuiPhoneInput, type PhoneValue } from '@whiteee/mui-phone-input';
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

## Numbering-plan resolution

```ts
import { resolveNumberingPlan } from '@whiteee/mui-phone-input/server';

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
Non-geographic plans expose no country.

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
} from '@whiteee/mui-phone-input/server';

const result = validatePhoneValue('+441481123456');
// status: 'possible', isPossible: true, isValid: false, accepted: true
```

Structural validation does not prove ownership, reachability, SMS/call
delivery, or that the number exists. Use an explicit verification flow such as
OTP when the product requires those guarantees.

## Server-safe helpers

```ts
import {
  assertPhoneValue,
  formatPhoneValueForDisplay,
  isPhoneValue,
  parsePhoneValue,
  resolveNumberingPlan,
  validatePhoneValue,
} from '@whiteee/mui-phone-input/server';
```

The server entrypoint imports no React, MUI, Emotion, DOM, or browser globals.

## MUI customization

The component registers `MuiPhoneInput` in the MUI theme and exposes stable
`root` and `input` utility classes.

```ts
const theme = createTheme({
  components: {
    MuiPhoneInput: {
      defaultProps: { fullWidth: true },
      styleOverrides: {
        root: { minWidth: 240 },
        input: { fontVariantNumeric: 'tabular-nums' },
      },
    },
  },
});
```
