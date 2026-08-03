# Minimal E.164 tracer evidence

Date: 2026-08-02
Bead: `mpi-oan.3`

## Delivered public surface

The main client entrypoint exports:

- `MuiPhoneInput`;
- `MuiPhoneInputProps` and deterministic change-detail types;
- `PhoneValue`;
- `isPhoneValue`, `parsePhoneValue`, and `assertPhoneValue`;
- `muiPhoneInputClasses` and `getMuiPhoneInputUtilityClass`.

The server entrypoint exports the Phone Value type/helpers, pure Numbering Plan
resolver, possible-by-default validation, and deterministic formatting. It
imports no React, MUI, Emotion, Maskito, DOM, browser globals, or Node-only
built-ins.

## Tracer contract

- Empty input is `undefined`.
- Every non-empty Phone Value begins with `+` and contains only digits.
- Incomplete candidates such as `+` and `+37529` are preserved.
- Controlled and uncontrolled modes use the same transaction model.
- Ownership is fixed at mount; development builds warn on a mode switch.
- One committed edit emits at most one public callback.
- External controlled updates and form reset reconciliation do not create
  callback loops.
- Callback details are serializable and contain value, previous value, reason,
  typed validation/acceptance state, and geographic/unresolved/non-geographic
  Numbering Plan Resolution. They contain no DOM or React event object.

The tracer now claims authority-backed country/numbering-plan resolution,
basic responsive Country Selector behavior, possible/strict validity, number
type, and deterministic international formatting. It intentionally does not yet
claim advanced display modes/masks, measured selector virtualization,
extensions, metadata variants, or form adapters.

## Browser evidence

Source Browser Mode tests cover:

- controlled Strict Mode typing and incomplete values;
- complete clear and deletion;
- native input ref focus;
- external reset without callback loops;
- uncontrolled form reset;
- invalid/formatted clipboard sanitation;
- Unicode digit composition lifecycle;
- rejected ownership switching;
- prevented-paste reason isolation;
- runtime MUI default props and root/input style overrides;
- selected/detected/resolved country stability across shared calling codes;
- non-geographic plans without fabricated country state;
- external controlled-number reconciliation without callback loops.
- possible-by-default validation and explicit strict/type policies;
- blur-default error presentation and correction clearing.

The same public tarball is installed outside the workspace in production
Next.js and Vite consumers. Their built applications are started and exercised
with Playwright Chromium for typing, canonical output, callback cardinality,
serializable details, focus, clear, Strict Mode, and external reset.

Latest and minimum React 19 / MUI 9 consumer matrices use the exact generated
`.tgz`; no workspace-source resolution is accepted as evidence.

The production Next.js verifier compares selected semantic fields from
JavaScript-disabled server output and the hydrated DOM for empty, geographic,
unresolved and non-geographic states. An isolated exact-package Node render
blocks `navigator` and `Intl.DateTimeFormat.resolvedOptions` access and requires
byte-identical repeated HTML. The Vite production smoke renders the same state
matrix. Full details are recorded in
`2026-08-02-ssr-packed-consumption-evidence.md`.

The current combined source matrix contains 90 Browser Mode tests in Chromium
and 89 in both Firefox and WebKit; all pass. The unit suite contains 86 tests.

## Package budgets

`docs/research/2026-08-02-tracer-package-budget.json` is generated and verified
from the exact artifact. The main measurement bundles runtime dependencies but
externalizes declared peers.

- Main closure budget: 25 KB gzip.
- Server entry budget: 10 KB gzip.

Current exact-artifact measurements are:

- main closure: 16,643 bytes gzip;
- server entry: 2,915 bytes gzip;
- packed tarball: 63,929 bytes.

CI rebuilds the artifact and requires exact byte/hash equality with the
committed measurement.

## Release boundary

No package was published. `mpi-g7a` remains blocked until the owner authenticates
to npm, proves `@whiteee` scope ownership, configures Trusted Publishing/OIDC,
and explicitly authorizes a prerelease publication.
