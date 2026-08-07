# Minimal E.164 tracer evidence

Date: 2026-08-02
Bead: `mpi-oan.3`
Revalidated: 2026-08-07 for `mpi-oan.8`

## Delivered public surface

The main client entrypoint exports:

- `MuiPhoneInput`;
- `MuiPhoneInputProps` and deterministic change-detail types;
- `PhoneValue`;
- `PhoneExtension`, extension presentation/slot contracts, and
  `PhoneInputExtensionInput`;
- `isPhoneValue`, `parsePhoneValue`, and `assertPhoneValue`;
- `parsePhoneExtension`, `parseRfc3966`, and `serializeRfc3966`;
- `formatPhoneInputPresentation` and typed display/mask/strategy contracts;
- `muiPhoneInputClasses` and `getMuiPhoneInputUtilityClass`.

The server entrypoint exports the Phone Value and extension/RFC 3966
type/helpers, pure Numbering Plan resolver, possible-by-default validation, and
deterministic formatting. It imports no React, MUI, Emotion, Maskito, DOM,
browser globals, or Node-only built-ins.

## Tracer contract

- Empty input is `undefined`.
- Every non-empty Phone Value begins with `+` and contains only digits.
- Extension canonical state is independent from Phone Value and contains only
  digits; no universal extension length is imposed.
- RFC 3966 and recognized extension-bearing paste split phone and extension
  before the existing phone transaction commits the canonical Phone Value.
- Incomplete candidates such as `+` and `+37529` are preserved.
- Controlled and uncontrolled modes use the same transaction model.
- Ownership is fixed at mount; development builds warn on a mode switch.
- One committed edit emits at most one public callback.
- Complete national keyboard input under an explicit selected country is
  canonicalized only after the country number becomes structurally valid;
  incomplete and possible-but-not-valid prefixes remain drafts.
- Complete-field paste and replacement may restore a selected country calling
  code when captured input evidence proves an authoritative national edit;
  partial ranges are never reclassified.
- Country-stripped national autofill uses selected-country metadata for every
  supported country and territory, follows the public possibility authority,
  and does not impose strict validity during normalization.
- External controlled updates and form reset reconciliation do not create
  callback loops.
- Queued input, reset, paste and composition-related work is invalidated at
  unmount and cannot call consumers or mutate uncontrolled state afterward.
- Callback details are serializable and contain value, previous value, reason,
  typed validation/acceptance state, and geographic/unresolved/non-geographic
  Numbering Plan Resolution. They contain no DOM or React event object.

The tracer now claims authority-backed country/numbering-plan resolution,
basic responsive Country Selector behavior, possible/strict validity, number
type, deterministic international/national/fixed-calling-code presentation,
declarative Display Masks, typed Format Strategy caret mapping, and custom
metadata compatibility. It intentionally does not yet claim measured selector
virtualization, metadata preset variants, or form adapters.

## Browser evidence

Source Browser Mode tests cover:

- controlled Strict Mode typing and incomplete values;
- complete clear and deletion;
- native input ref focus;
- React 19 callback-ref cleanup, legacy null detachment, object-ref clearing,
  ref identity replacement, Strict Mode balance, and custom native slots;
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
- selected-country national autofill recovery across controlled,
  uncontrolled, Strict Mode, rejection, incomplete input metadata, invalid
  replacement, range replacement and unmount boundaries.
- selected-country complete national keyboard and clipboard input across
  controlled and uncontrolled ownership, including Unicode digits and
  possible-but-not-valid draft preservation.
- extension controlled/uncontrolled ownership, optional max-length policy,
  none/separate/inline/custom presentation, reset/external reconciliation,
  RFC 3966 and human-readable extension paste, SSR/hydration, keyboard focus,
  slots/slotProps and WCAG-oriented error association. The focused 19-test
  extension matrix passes in Chromium, Firefox, and WebKit.

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

The pre-extension main baseline contains 218 Browser Mode tests and passes as a
complete Chromium matrix; its pre-existing 192-test cross-browser baseline
passes in Chromium, Firefox, and WebKit. This slice adds a focused 19-test
extension matrix that passes in Chromium, Firefox, and WebKit. The current unit
suite contains 209 tests. Browser files run serially because focus-sensitive
fixtures share `document.activeElement`; repeatability evidence is recorded in
`2026-08-03-browser-focus-serialization-evidence.md`.

## Package budgets

`docs/research/2026-08-02-tracer-package-budget.json` is generated and verified
from the exact artifact. The main measurement bundles runtime dependencies but
externalizes declared peers.

- Main closure budget: 32 KB gzip. The previous 28 KB budget covered the
  formatting/mask surface; the extension UI, independent ownership state and
  standards-based import/export advance the production-shaped public surface.
  The budget remains bounded instead of weakening transaction or accessibility
  behavior to fit the earlier tracer envelope.
- Server entry budget: 10 KB gzip.

Current exact-artifact measurements are:

- main closure: 30,519 bytes gzip;
- server entry: 6,126 bytes gzip;
- packed tarball: 300,646 bytes. The tarball increase is the intentional
  publication cost of the independently built RHF and Zod JavaScript,
  declaration, and source-map entrypoints; neither adapter is part of the main
  or server runtime closure unless its explicit subpath is imported.

CI creates one immutable package artifact, reuses that same tarball across the
package/runtime/tracer/consumer gates, and requires exact byte/hash equality
with the committed measurement. The tracer build pins Rolldown's working
directory to the extracted package root so temporary extraction names cannot
enter generated module-region comments.

## Release boundary

No package was published while generating this source evidence. The human npm
identity/scope gate `mpi-g7a` is closed. Actual publication remains controlled
by the tag-only GitHub OIDC workflow and `mpi-oan.17`.
