# @wh1teee/mui-phone-input

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
