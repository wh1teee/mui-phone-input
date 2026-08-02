# @whiteee/mui-phone-input

Modern React 19 and Material UI 9 phone input. The current prerelease tracer
provides a canonical international candidate, controlled and uncontrolled
ownership, MUI theme registration, stable utility classes, and deterministic
event-independent change details.

The package is still under active 1.0 development. Country selection,
numbering-plan resolution, possibility/validity evaluation, masks, extensions,
locales, flags, and form adapters are delivered in later gated slices.

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

## Server-safe helpers

```ts
import {
  assertPhoneValue,
  isPhoneValue,
  parsePhoneValue,
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
