# Early SSR and packed-package consumption evidence

Date: 2026-08-02
Bead: `mpi-oan.13`

## Exact artifact boundary

Every proof in this lane starts by rebuilding and packing the real
`@whiteee/mui-phone-input` `.tgz`. Temporary Next.js App Router and Vite
applications install that tarball with strict peer dependencies; no workspace
source alias or linked package path is accepted as runtime evidence.

Both applications complete clean production builds and start their production
servers before Playwright exercises the installed artifact. Latest React
19.2/MUI 9.2 and minimum React 19.0/MUI 9.0 consumer matrices are required.

## Deterministic Node server render

The copied Next.js consumer includes an exact-package Node probe using
`react-dom/server`. It renders the MUI component matrix twice and requires the
two HTML strings to be byte-identical.

The probe covers:

- empty: `undefined`, unresolved plan, empty validation state;
- geographic: `+375291234567`, geographic plan, valid state;
- unresolved shared code: `+1`, unresolved plan, incomplete state;
- non-geographic: `+80012345678`, non-geographic plan, valid state.

Each render uses explicit IDs, locale, selector presentation and placeholders.
The probe installs a throwing `navigator` getter and makes
`Intl.DateTimeFormat.prototype.resolvedOptions` throw before dynamically
importing React, MUI and the exact package. A passing probe proves that module
evaluation and server render do not access those two locale/browser seams.
Browser-only effects and input-engine attachment do not execute.

## Next.js HTML and hydration parity

The production Next.js server is opened first in a JavaScript-disabled browser
context. Playwright records the semantic server snapshot for all four states:

- canonical input value;
- placeholder;
- numbering-plan kind;
- validation status and acceptance;
- effective selected-country state;
- selector accessible label and visible identity.

A normal JavaScript-enabled context then waits for a post-effect hydration
marker and records the same semantic snapshot. The two semantic snapshots must
be deeply equal. Page errors and console errors, including React hydration
diagnostics, are release failures.

The App Router page also imports `resolveNumberingPlan` exclusively from the
`/server` entry and emits an independently computed four-state server matrix.
This proves the server component can consume the neutral entry while the client
component consumes the MUI entry.

Flags are not part of the current early tracer, so this lane does not claim a
flag renderer. It proves that the currently shipped country-selector identity,
placeholder, value, plan and validation state do not change at hydration.

## Vite runtime parity

The production Vite consumer renders the same four-state matrix from the exact
tarball and validates the same expected semantic states after mount. It also
imports and executes the server-safe resolver entry, proving that the neutral
helpers remain consumable in a browser build without pulling in the MUI client
graph.

The existing interactive smoke proof continues to cover typing, country
selection, validation, refs, clear/reset, callbacks, and the composable API in
both Next.js and Vite.

## Browser and neutral bundle graphs

Package verification reads source maps directly from the generated `.tgz`.

The browser graph must contain:

- `MuiPhoneInput`;
- `PhoneInputCountrySelector` and composable primitives;
- `usePhoneInput`;
- the selected input-engine bridge.

The neutral server graph must contain exactly:

- `phone-value.ts`;
- `numbering-plan.ts`;
- `phone-validation.ts`.

It may not contain MUI, React component, input-engine, DOM, browser, or optional
form-adapter sources. The built server JavaScript remains free of React, MUI,
Emotion, browser globals and Node-only imports. The workspace contract retains
the explicit tsdown `browser` and `neutral` platform assertions.

## Current artifact and release boundary

The package source is unchanged by this proof lane, so the exact artifact
measurement remains:

- main closure: 15,708 bytes gzip;
- server entry: 2,915 bytes gzip;
- packed tarball: 59,345 bytes.

No package was published. npm identity, Trusted Publishing and prerelease
authorization remain behind owner gate `mpi-g7a`.
