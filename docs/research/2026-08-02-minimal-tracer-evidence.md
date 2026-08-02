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

The server entrypoint exports the Phone Value type/helpers and the pure
Numbering Plan resolver. It imports no React, MUI, Emotion, Maskito, DOM,
browser globals, or Node-only built-ins.

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
  validation placeholder state, and geographic/unresolved/non-geographic
  Numbering Plan Resolution. They contain no DOM or React event object.

The tracer now claims authority-backed country and numbering-plan resolution.
It intentionally does not yet claim possibility/validity policy, number type,
advanced formatting, selector behavior, extensions, or form adapters. Those
remain owned by later Beads.

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

The same public tarball is installed outside the workspace in production
Next.js and Vite consumers. Their built applications are started and exercised
with Playwright Chromium for typing, canonical output, callback cardinality,
serializable details, focus, clear, Strict Mode, and external reset.

Latest and minimum React 19 / MUI 9 consumer matrices use the exact generated
`.tgz`; no workspace-source resolution is accepted as evidence.

## Package budgets

`docs/research/2026-08-02-tracer-package-budget.json` is generated and verified
from the exact artifact. The main measurement bundles runtime dependencies but
externalizes declared peers.

- Main closure budget: 25 KB gzip.
- Server entry budget: 10 KB gzip.

Current exact-artifact measurements are:

- main closure: 8,012 bytes gzip;
- server entry: 1,529 bytes gzip;
- packed tarball: 20,408 bytes.

CI rebuilds the artifact and requires exact byte/hash equality with the
committed measurement.

## Release boundary

No package was published. `mpi-g7a` remains blocked until the owner authenticates
to npm, proves `@whiteee` scope ownership, configures Trusted Publishing/OIDC,
and explicitly authorizes a prerelease publication.
