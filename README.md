# Phone Input for MUI, Base UI and shadcn

[![npm version](https://img.shields.io/npm/v/@wh1teee/mui-phone-input?logo=npm&label=npm&color=cb3837)](https://www.npmjs.com/package/@wh1teee/mui-phone-input)
[![npm downloads](https://img.shields.io/npm/dm/@wh1teee/mui-phone-input?logo=npm&label=downloads)](https://www.npmjs.com/package/@wh1teee/mui-phone-input)
[![CI](https://github.com/wh1teee/mui-phone-input/actions/workflows/ci.yml/badge.svg)](https://github.com/wh1teee/mui-phone-input/actions/workflows/ci.yml)
[![license](https://img.shields.io/npm/l/@wh1teee/mui-phone-input)](./LICENSE)
[![docs](https://img.shields.io/badge/docs-mui--phone--input--docs.vercel.app-111)](https://mui-phone-input-docs.vercel.app)

Accessible international phone input for React 19, with Material UI and Base UI/shadcn renderers over one shared phone-editing engine and `libphonenumber-js` as the only numbering authority.

```sh
npm install @wh1teee/mui-phone-input
```

## Features

- Canonical E.164-style value (`+digits`) kept separate from display formatting.
- Searchable, responsive country selector with localized names, preferred and
  popular countries, and calling-code search.
- Possible-number validation by default; strict validity and number types are
  explicit opt-ins. Non-geographic numbering plans are supported.
- Formatting modes, display masks, separate phone extensions, RFC 3966
  import/export.
- Independent entrypoints: MUI, Base UI, shadcn skin, headless controller,
  server-safe helpers, React Hook Form, Zod, metadata presets, locale packs and
  flags. Each renderer needs only its own peers.
- Deterministic SSR (Next.js App Router without package exceptions), real
  browser interaction tests and WCAG 2.2 AA release gates.

## Install

Material UI:

```sh
pnpm add @wh1teee/mui-phone-input @mui/material @emotion/react @emotion/styled
```

Base UI or shadcn:

```sh
pnpm add @wh1teee/mui-phone-input @base-ui/react@^1.8
```

React 19 and React DOM 19 are required. The package is ESM only.

## Quick start

### MUI

```tsx
'use client';

import { useState } from 'react';
import { MuiPhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input';
import '@wh1teee/mui-phone-input/flags.css';

export function PhoneField() {
  const [phone, setPhone] = useState<PhoneValue>();
  return (
    <MuiPhoneInput
      label="Phone number"
      defaultCountry="US"
      value={phone}
      onChange={setPhone}
    />
  );
}
```

### shadcn

```tsx
'use client';

import { useState } from 'react';
import { PhoneInput, type PhoneValue } from '@wh1teee/mui-phone-input/shadcn';
import '@wh1teee/mui-phone-input/shadcn.css';

export function PhoneField() {
  const [phone, setPhone] = useState<PhoneValue>();
  return (
    <PhoneInput label="Phone" defaultCountry="US" value={phone} onChange={setPhone} />
  );
}
```

### Headless

`usePhoneInput` from `@wh1teee/mui-phone-input/headless` returns the same
controller both renderers use. Spread `phone.getInputProps()` onto your own
`<input>` and, optionally, pass `phone` to the Base UI `PhoneInputCountrySelector`.

## Entrypoints

| Import | Purpose |
| --- | --- |
| `@wh1teee/mui-phone-input` (`/mui`) | `MuiPhoneInput`, primitives, controller and helpers |
| `/base-ui`, `/shadcn` | Unstyled Base UI `PhoneInput` and country selector |
| `/shadcn.css` | Optional skin using shadcn CSS variables |
| `/headless` | `usePhoneInput` and helpers without UI peers |
| `/server` | Parsing, numbering-plan, formatting and validation without React |
| `/react-hook-form`, `/base-ui/react-hook-form` | React Hook Form adapters |
| `/zod` | Zod schema factories |
| `/metadata/{max,min,mobile,custom}` | Metadata presets and custom-metadata validation |
| `/flags`, `/flags.css` | Flag contracts and local SVG flag stylesheet |
| `/locales/{en,be,ru}` | Selector message packs |

Every browser renderer also has a `/min` variant with smaller official metadata.

## Documentation

- [Package README](./packages/mui-phone-input/README.md): full API reference.
- [UI adapters guide](./docs/guides/ui-adapters.md): MUI, Base UI, shadcn and
  application-owned fields.
- [Product context](./CONTEXT.md) and [architecture decisions](./docs/adr).
- [Changelog](./packages/mui-phone-input/CHANGELOG.md).
- [Contributing](./CONTRIBUTING.md).

## Reporting problems

Use the [Q&A Discussions intake](https://github.com/wh1teee/mui-phone-input/discussions/new?category=q-a)
for bug reports and support questions.

## License

[MIT](./LICENSE)
