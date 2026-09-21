# @wh1teee/mui-phone-input

## 1.0.3

### Patch Changes

- Replace the timer-armed Material UI click-away wrapper with an owned document listener bound to the selector surface and trigger. Desktop popup dismissal now works immediately and remains independent of whether a custom popup slot forwards its ref, including WebKit, portals and inline rendering.

## 1.0.2

### Patch Changes

- Replace the build-only virtual metadata specifier with a normal source-resolvable max-metadata module while preserving compile-time `/min` substitution. Direct Vite/WCAG source consumers, exact package builds, max/min metadata isolation and the WebKit selection reconciliation fix now share one release-safe graph.

## 1.0.1

### Patch Changes

- Prevent a WebKit/native-input reconciliation race from pairing caret offsets from an advanced live DOM value with an older formatted presentation. Reconciliation now consumes DOM selection only when it belongs to the exact authoritative display string; the integrity guard remains strict and controlled ownership is unchanged.

## 1.0.0

### Major Changes

- Publish the stable renderer-independent phone-input contract. The legacy root remains the MUI API, while explicit MUI, headless, Base UI and shadcn entrypoints keep optional renderer peers isolated.
- Add renderer-specific `/min` and React Hook Form entrypoints backed by official `libphonenumber-js` min metadata. Exact-artifact gzip/Brotli budgets include runtime phone dependencies and reject metadata or renderer leakage.
- Generalize the trusted npm OIDC workflow for immutable prerelease and stable publication, with exact registry byte parity, provenance, Next.js 16 App Router, Vite, browser and accessibility evidence.

## 0.1.0-next.9

### Minor Changes

- Add independent headless, Base UI and shadcn exports over the existing phone engine.
  Keep legacy MUI imports and add an explicit `/mui` alias. Unused renderers are now
  optional peers, with runtime and strict-TypeScript isolation verified on packed
  consumers. Include searchable localized country selection, scoped portals,
  opt-in semantic shadcn styling and React Hook Form phone/extension bindings.

## 0.1.0-next.8

### Patch Changes

- 7b07e83: Declare `@types/react` as an optional peer so isolated pnpm Global Virtual Store consumers resolve the published declarations without inheriting workspace-only type packages. Runtime exports and bundle bytes are unchanged.
- 7b07e83: Refresh `libphonenumber-js` metadata from 1.13.10 to 1.13.13 after human review of the checked-in golden-corpus semantic diff. No reviewed possibility, strict-validity, country-resolution, number-type, or example behavior changed.
- 23ad4b2: Refresh the verified production matrix to Maskito 5.4, React 19.3, MUI 9.4, React Hook Form 7.88, Zod 4.6, Vite 8.3, and current compatible tooling. The published runtime remains within the frozen bundle budget, and tsdown stays pinned to 0.22.14 to preserve the explicit adapter type-export contract.

## 0.1.0-next.7

### Patch Changes

- 8dc9ab9: Make explicit country selection authoritative in the default Country Selector,
  including when the current value is a non-geographic/global-service number. Preserve
  the existing national digits under the requested calling code, keep selected UI state
  separate from detected/resolved numbering authority, and let validation report drafts
  that still need correction instead of silently rejecting the country click.

## 0.1.0-next.6

### Patch Changes

- 71a80bf: Add max, min, mobile, and validated custom metadata presets together with a
  human-reviewed metadata freshness pipeline and client/server metadata parity.

## 0.1.0-next.5

### Patch Changes

- d87460b: Accept complete national numbers from ordinary keyboard input and full-field
  clipboard paste under an explicit selected country while preserving incomplete
  and possible-but-not-valid keyboard drafts until they become structurally valid.

## 0.1.0-next.4

### Patch Changes

- 191f833: Expose `parseNationalPhoneValue` from the client and neutral server entrypoints
  so applications can apply the same selected-country authority to complete
  national input on both sides of the network boundary.

## 0.1.0-next.3

### Patch Changes

- 4bca1bf: Align country-stripped complete-field autofill with the selected-country
  numbering authority and the default possibility validation policy, including
  one authoritative callback when autofill normalizes back to the existing
  canonical value.

## 0.1.0-next.2

### Patch Changes

- a1fb14e: Retry registry verification while npm propagates a newly published canary.

## 0.1.0-next.1

### Patch Changes

- 230f0e3: Correct the canonical npm scope to match the authenticated npm and GitHub
  identity, and fail release preflight when the package scope, repository owner,
  or authenticated npm identity diverge.

## 0.1.0-next.0

### Minor Changes

- da00150: Add the accessible responsive country selector, controlled and uncontrolled country ownership, exact country-selection transactions, portal policies, and the public composable selector primitive.
- 690c8f0: Add possible-by-default phone validation, explicit strict/type/custom policies,
  server-safe formatting and validation helpers, and blur-default MUI error
  presentation with typed serializable results.
- e5cb842: Preserve incompatible phone drafts during country selection and expose typed
  applied/conflict results through `resolvePhoneCountrySelection`,
  `actions.selectCountry`, and `onCountrySelection`.
- 7970acf: Add the minimal production-shaped `MuiPhoneInput` tracer, canonical Phone Value
  helpers, controlled and uncontrolled ownership, serializable change details,
  MUI theme registration, utility classes, and server-safe parsing helpers.
- 5187132: Replace unfinished international calling-code prefixes when a country is
  selected instead of appending those prefix digits as a national draft.
- 4251d12: Add the shared `usePhoneInput` controller, supported composable primitives,
  prepared state and accessibility prop getters, stable validation-message
  classes, typed MUI owner state, and exact-tarball composition examples.
- 7e0c87e: Add authority-backed geographic, shared-calling-code, territory, and
  non-geographic numbering-plan resolution to client/server APIs and
  `MuiPhoneInput` change details.
- 6055c9d: Emit deterministic `onCountryChange` events for default, user, input, paste,
  external-value, and reset transitions with nullable resolved countries and full
  previous/next numbering-plan details.

### Patch Changes

- 2d1465c: Preserve explicit territory selections when pinned numbering metadata validates
  the complete number for that territory but cannot distinguish its public label
  from the parent numbering country.
- e5f551a: Stop advertising empty future subpaths in the early canary. The implemented
  paths are `.`, `./server`, and `./package.json`. `./react-hook-form`, `./zod`,
  `./flags/local`, `./locales/en`, `./metadata/max`, `./metadata/min`,
  `./metadata/mobile`, and `./metadata/custom` remain intentionally absent until
  their owning features ship with exact-tarball semantic export evidence.
