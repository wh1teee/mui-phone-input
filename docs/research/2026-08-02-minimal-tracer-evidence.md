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
- Queued input, reset, paste and composition-related work is invalidated at
  unmount and cannot call consumers or mutate uncontrolled state afterward.
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
- queued input, form-reset, paste and composition cancellation at unmount;
- Strict Mode remount isolation and pre-passive layout-effect transactions;
- complete Country Selector Tab order across portals, contenteditable, media,
  details/summary, positive tab order and open shadow roots;
- rejected ownership switching;
- prevented-paste reason isolation;
- runtime MUI default props and root/input style overrides;
- controller-owned MUI native-input value, identity, state and helper ARIA
  across object/function slot props, including falsey helper content;
- exactly-once observational native change/input, capture, paste, composition
  and blur handlers without duplicate semantic callbacks;
- selected/detected/resolved country stability across shared calling codes;
- non-geographic plans without fabricated country state;
- external controlled-number reconciliation without callback loops;
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

The current combined source matrix contains 139 Browser Mode tests per engine;
all pass in Chromium, Firefox, and WebKit. The unit suite contains 94 tests.
Browser files run serially because focus-sensitive fixtures share
`document.activeElement`; repeatability evidence is recorded in
`2026-08-03-browser-focus-serialization-evidence.md`.

## Package budgets

`docs/research/2026-08-02-tracer-package-budget.json` is generated and verified
from the exact artifact. The main measurement bundles runtime dependencies but
externalizes declared peers.

- Main closure budget: 25 KB gzip.
- Server entry budget: 10 KB gzip.

Current exact-artifact measurements are:

- main closure: 22,599 bytes gzip;
- server entry: 4,794 bytes gzip;
- packed tarball: 86,584 bytes.

CI rebuilds the artifact and requires exact byte/hash equality with the
committed measurement.

## Release boundary

No package was published. `mpi-g7a` remains blocked until the owner authenticates
to npm, proves `@whiteee` scope ownership, configures Trusted Publishing/OIDC,
and explicitly authorizes a prerelease publication.
