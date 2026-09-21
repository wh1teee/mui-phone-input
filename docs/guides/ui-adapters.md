# UI adapters

The package identity remains `@wh1teee/mui-phone-input`; it now describes a
family of compatible renderers rather than forcing Material UI into every app.
See [ADR 0007](../adr/0007-share-phone-state-across-independent-ui-adapters.md)
and the [accepted specification](../specs/0002-multiple-ui-adapters.md).

| Import | Required UI dependency | Purpose |
| --- | --- | --- |
| package root or `/mui` | MUI 9 and Emotion | Existing component, theme and slots |
| `/headless` | React 19 | Controller and phone helpers for an owned field |
| `/base-ui` | Base UI 1.8+ and React 19 | Unstyled complete field and country selector |
| `/shadcn` | Base UI 1.8+ and React 19 | Same composition with opt-in `/shadcn.css` |
| `/base-ui/react-hook-form` or `/shadcn/react-hook-form` | Base UI and RHF | Independent phone and extension form fields |
| `/server` | No UI renderer | Parsing and validation outside React |

Append `/min` after the renderer name (`/mui/min`, `/headless/min`,
`/base-ui/min`, `/shadcn/min`) when the application deliberately accepts the
smaller official metadata's reduced strict-validity/type detail. Form adapters
follow the same pattern, for example `/base-ui/min/react-hook-form`. The default
paths retain max metadata. Install the stable package from `latest` or pin an
exact 1.x version.

## An application-owned field

Do not fork the formatter into the product. `usePhoneInput` owns the canonical
value, display, selection, composition, paste and native form reset. Spread
`phone.getInputProps()` onto the actual native field and preserve its returned
ref and event handlers. Pass the same `phone` to `PhoneInputCountrySelector`.
Compose an external input ref rather than replacing the engine's ref.

Use `parsePhoneValue` to adapt a previously formatted international value;
translate an empty `PhoneValue` (`undefined`) to `''` only at a form boundary that
requires strings. Keep product validation policies explicit. A normalized
candidate is not proof of reachability, ownership, allocation or provider consent.

The picker accepts `portalContainer`. Pass a scoped theme's portal node in an
embedded app; pass `null` until that node mounts. This prevents an SSR/hydration
fallback into an operator document body. Passing `dir` controls popup placement
and text direction while the shared engine keeps phone digits LTR.

## Styling

The library does not import CSS from JavaScript. Import `/shadcn.css` explicitly,
or supply slot classes through `classNames` and `countrySelector.classNames`.
The stylesheet scopes every selector to `data-slot="phone-*"`. It uses standard
shadcn variables, does not include Preflight and needs no Tailwind scan rules.
Applications whose design tokens have another namespace should map the standard
variables within their phone/popup scope, not change global host variables.

Country flags default to `none`; ISO codes and accessible names remain visible.
Local SVG flags and external opt-in flags reuse the existing `/flags` contract.
An external flag provider must retain the same privacy/CSP policy as the app.

## Shared behavior, different presentation

The phone state machine, validation options, metadata presets, display modes,
mask engine, extension/RFC 3966 contracts and transaction reasons are shared.
Renderer-specific presentation is intentionally not interchangeable: MUI keeps
its theme/slot/adaptive-dialog API; Base UI owns Combobox interactions and exposes
native/slot props, scoped portals and CSS variables. No second phone engine is
hidden behind a similar-looking field.

## Verification

`pnpm verify:ui-adapters` installs the exact packed artifact into four isolated
consumers: headless, Base UI, Base UI + RHF and legacy/explicit MUI. It asserts that
the unused UI renderer cannot resolve, checks all dependency declarations with
`skipLibCheck=false`, and server-renders the actual installed components. The
existing export verifier also checks all entrypoint names, client/server
boundaries and optional-peer failure modes. Both run in the artifact suite.

Strict GVS consumers inherit the reviewed package extensions for upstream missing
dependency edges. These repairs retain strict checking and GVS; they do not
silence declaration failures. The Floating UI repair is bounded to version 2.1.9
and should be removed when its upstream package metadata supplies that edge.

Browser tests exercise both MUI and Base UI through the same number-editing
scenarios, then cover the new picker, native refs, locale/RTL/scoped portals,
independent extensions, accessibility and RHF bindings. Browser automation does
not substitute for physical-device or screen-reader certification.

The bundle verifier separately bundles every public renderer path from the
exact tarball. It includes phone runtime dependencies and the selected metadata,
keeps app-owned React/UI peers external, enforces gzip/Brotli ceilings, confirms
that max and min paths do not mix metadata, and rejects MUI/Base UI leakage in
either direction. The Next.js 16 App Router consumer uses no package-specific
transpilation, server externalization, or experimental import optimizer.
