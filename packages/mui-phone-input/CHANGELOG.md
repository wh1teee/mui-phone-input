# @wh1teee/mui-phone-input

## 1.3.0

### Minor Changes

- Let products put the country list in their own sheet, choose what the trigger shows, follow a late default country and search countries in Japanese.

  - Base UI/shadcn export `PhoneCountryTrigger` and `PhoneCountryList`, the two parts the built-in popover is now made of. Put the list in your own dialog or bottom sheet (it owns drag, focus trap and back gesture) and close it from `onSelect(country)`, which runs after the selection is applied. The list is named by `messages.dialogTitle`, owns its keyboard model, marks and scrolls to the selected row, and mirrors `aria-activedescendant` when focused itself. `autoFocusSearch` (`true`, `false` or `'fine-pointer'`) keeps the on-screen keyboard closed on touch devices. Both parts use the `locale` and `messages` given to `usePhoneInput` (new `messages` option, also a top-level `PhoneInput` prop; `phone.state` gains optional `locale` and `messages`) unless their own props say otherwise.
  - Base UI/shadcn `PhoneInput` gains `renderCountrySelector`, which replaces only the country presentation (for example a host sheet on phones and the built-in popover on wide screens) and receives `phone`, `triggerProps` (including `countrySelector.triggerProps`), `listProps`, `defaultSelector` and `focusInput`.
  - Behaviour change, Base UI/shadcn: the standalone `PhoneInputCountrySelector` now takes `locale` and `messages` from `phone` when its own props omit them (1.2.1 used English), and the built-in popover centres the selected row when it opens.
  - `triggerContent` (`'auto'`, `'calling-code'`, `'country-code'`, `'both'` or a render function) on both renderers. `'calling-code'` draws `+375` in national mode; in international modes, where the input already starts with the code, it falls back to `'auto'`. `'auto'` keeps the current rendering.
  - Behaviour change, Base UI/shadcn: the country trigger's accessible name now always contains the selected country and calling code through the new optional `triggerLabel` message present in every locale. Without a host label it was "Select country" and is now "Select country. Belarus, BY, +375", like the MUI trigger. A host `triggerProps['aria-label']` used to replace the name and is now its prefix ("Country. Belarus, BY, +375"). MUI is unchanged: its default name already carried the selection, and a host `aria-label` is still the whole name.
  - While a field is untouched (empty, never edited, nothing picked), the selected country follows a changed `defaultCountry`, reported by `onCountryChange` with reason `default`. A late value that is missing, empty or not a country of the loaded metadata is ignored, as before.
  - Add the Japanese locale, `@wh1teee/mui-phone-input/locales/ja`, with `searchAliases`: kana readings of every country name written with kanji. A new `searchAliases` option of the country list accepts them, so with `searchAliases: ja.searchAliases` a guest finds 日本 by `にほん`. Search now folds hiragana to katakana, so `べらるーし` finds ベラルーシ before IME conversion.
  - `shadcn.css` lets off-screen option rows skip layout and paint (`content-visibility: auto` with a single-line row height as intrinsic size), so the full list opens cheaper; option rows use `box-sizing: border-box`, and the trigger chevron also turns on `aria-expanded="true"` for triggers outside Base UI.

  Entry sizes stay within budget (gzip): `/base-ui` and `/shadcn` +1.8 KB (85.5 → 87.2 KB), `/base-ui/min` and `/shadcn/min` +1.7 KB (64.3 → 66.0 KB; their budget moves from 66,000 to 66,141 bytes, measured 66,045 plus 96 B headroom), `/mui` +0.5 KB, `/headless` +0.2 KB. The MUI main closure budget moves from 33,506 to 34,023 bytes gzip (measured +517 B, 96 B headroom kept).

## 1.2.1

### Patch Changes

- Polish country selector feel. The shadcn popup now grows from its trigger and fades out quicker than it opens, the trigger chevron turns while the list is open in both renderers, and the close and selected indicators are drawn icons instead of text glyphs. Reduced-motion users keep the fade without movement.

## 1.2.0

### Minor Changes

- Fix issues found in an independent review and stop repeating the calling code.

  - The country trigger no longer repeats the calling code that international display modes already show in the input; it shows the code only in national mode and gains a dropdown chevron. `PhoneInputState` exposes `displayMode`.
  - The trigger follows the number: an explicit selection stays while its calling code matches, a different calling code shows the country the number resolves to, and non-geographic numbers no longer show an invented country.
  - Pasting a `tel:` URI or a number with an extension can no longer replace a fixed calling code; the previous number and extension are kept.
  - A `+` Display Mask in national display mode is rejected instead of silently changing the number.
  - `extensionMaxLength` counts digits, so `12-34` keeps all four digits.
  - `parseRfc3966` rejects unknown mandatory (`m-`) parameters.
  - MUI React Hook Form: extension props work without `extensionName`, and custom-rendered extensions receive the field name and blur binding.
  - Base UI/shadcn: an application `error` shows its `helperText`; flags are sized consistently.
  - `/headless` (and `/base-ui`, `/shadcn`) export the shared formatting and state types.

## 1.1.1

### Patch Changes

- Keep the shadcn country popup readable when the application's root `--radius` is pill-sized. The popup is portaled out of the field's theme scope, so it could inherit a huge radius and clip the search field and options into a rounded shape. Popup, search and option corners now follow `--radius` capped at `0.75rem`, and `--phone-input-popup-radius` sets the popup radius explicitly.

## 1.1.0

### Minor Changes

- Make country selection predictable in every renderer.

  - Base UI/shadcn search now uses the shared ranking instead of list order, so typing `us` and pressing Enter selects United States rather than the first alphabetical match.
  - While a query is active, both renderers show one flat ranked list and highlight the best match; previously MUI kept the highlight on the already selected country and split results across group headers.
  - Exact calling-code searches list the metadata's main country first (`+1` → United States, `+44` → United Kingdom, `+7` → Russia).
  - The full country list is shown by default (MUI previously stopped at 50). `resultLimit` remains available in MUI and is now available in Base UI.
  - Add `getPopularPhoneCountries(count)` for a configurable pinned group of the most populous countries; Base UI now renders the "Preferred countries" and "All countries" groups.
  - Choosing a country moves focus to the phone input in both renderers; Escape and close still return focus to the trigger.
  - The MUI mobile dialog list fills the available height; the Base UI trigger shows the calling code.
  - The extension input is always left-to-right, and the shadcn skin styles extension errors independently of phone errors.

## 1.0.5

### Patch Changes

- Move the blocking compiler and declaration checks to the stable native TypeScript 7.0.2 toolchain. Keep the official `@typescript/typescript6` compatibility package only for tsdown, documentation transforms, and repository checks that still embed TypeScript's programmatic API.
- Add an executable toolchain contract that proves `tsc` resolves to TypeScript 7, `tsc6` remains available for API consumers, and exact packed Next.js/Vite/renderer consumers type-check with the same dual-toolchain boundary.

## 1.0.4

### Patch Changes

- Correct the stable release evidence contract by explicitly documenting the max, min, mobile and custom metadata presets. Runtime bytes and the WebKit popup-dismissal fix are unchanged from the verified 1.0.3 candidate.

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
