# Specification: MUI Phone Input 1.0

## Problem Statement

React products that use Material UI need an international phone input that is correct, attractive, accessible, deeply customizable, and safe to reuse across checkout, account, contact, OTP, and enterprise forms. Existing packages each solve only part of this problem: modern MUI integration may lack masks and searchable country selection; highly configurable packages often contain legacy component architecture, stale country tables, weak typing, or fragile caret and paste behavior; custom product fields become expensive to maintain and duplicate telephone rules.

Consumers need one package that works well without configuration while allowing complete visual composition and advanced formatting without requiring them to implement phone parsing, country resolution, input normalization, caret handling, or validation. The package must learn from mature open-source libraries and known production failures instead of replacing proven behavior with untested local inventions.

## Solution

Publish a modern ESM package for React 19 and MUI 9+ that provides a polished `MuiPhoneInput`, a shared `usePhoneInput` state contract, and supported Composable Primitives. The package uses a single Input Transaction engine adapted from mature donor behavior, and `libphonenumber-js` remains the sole telephone numbering authority.

The component exposes a normalized Phone Value independently from Display Value, supports international, national, and fixed-calling-code formats, offers automatic formatting, declarative Display Masks, and safe custom Format Strategies, and keeps extensions separate. It includes a searchable and virtualized responsive Country Selector, local and opt-in external flags, MUI theme registration, localization, React Hook Form and Zod adapters, and server-safe helpers. Accessibility, SSR determinism, privacy, package correctness, browser behavior, and performance budgets are release requirements.

## User Stories

1. As a product developer, I want a phone input that works correctly with minimal props, so that a standard contact form does not require phone-domain expertise.
2. As a design-system developer, I want full MUI theme registration, so that the field follows shared variants, colors, spacing, and component defaults.
3. As an advanced component author, I want `usePhoneInput` and Composable Primitives, so that I can replace the visual composition without copying phone logic.
4. As a form owner, I want the external Phone Value to exclude spaces and punctuation, so that stored data does not depend on presentation.
5. As a user entering a number, I want my incomplete draft preserved, so that controlled forms do not erase input before it becomes valid.
6. As a user correcting a digit in the middle, I want the caret to remain at the logical position, so that formatting does not make editing frustrating.
7. As a user pasting a formatted international number, I want it normalized and displayed correctly, so that I do not need to retype it.
8. As a user pasting a national number, I want it interpreted using the selected country, so that common local formats work naturally.
9. As a user pasting an RFC 3966 telephone URI, I want the number and extension separated correctly, so that copied enterprise contact data works.
10. As a mobile user, I want browser autofill to replace the phone draft correctly, so that saved contact information is usable.
11. As an international user, I want supported Unicode digits normalized, so that my keyboard and locale do not block entry.
12. As an IME user, I want unfinished composition left untouched, so that the component does not corrupt text during composition.
13. As a user selecting a country, I want compatible national digits retained where safe, so that changing country does not silently destroy work.
14. As a user entering a shared calling code, I want the selected flag to remain stable until the digits identify another country, so that `+1`, `+7`, and `+44` do not cause premature flag changes.
15. As a user pasting a complete international number, I want the correct country resolved immediately, so that the selector matches the number.
16. As a developer, I want Selected, Detected, and Resolved Country exposed distinctly, so that product behavior can respond without guessing component internals.
17. As a developer, I want all country changes to include a typed reason, so that analytics-free application logic can distinguish user, paste, input, default, and external updates.
18. As a user, I want a searchable country selector, so that I can find a country without scanning a long list.
19. As a user, I want country search to match localized and English names, ISO codes, and calling codes, so that different search habits work.
20. As a product owner, I want Preferred Countries pinned without duplicates, so that common markets are easy to reach without changing number semantics.
21. As a mobile user, I want a full-screen country-selection dialog, so that the long country list is usable on a small screen.
22. As a desktop user, I want an anchored country-selection popper, so that selection remains compact and contextual.
23. As a modal user, I want explicit portal-container control, so that Dialog, Drawer, BottomSheet, overflow, and focus-lock constraints are respected.
24. As a keyboard user, I want standard combobox and listbox navigation, so that arrows, Enter, Escape, Home, End, Page keys, typeahead, and Tab behave predictably.
25. As a screen-reader user, I want meaningful labels, state announcements, error relationships, and focus return, so that the complete field is operable without vision.
26. As a low-vision user, I want the component to work at high zoom and in forced-colors mode, so that content remains perceivable and operable.
27. As an RTL user, I want the interface mirrored while the international phone number remains readable in LTR order, so that locale direction does not corrupt telephone notation.
28. As a developer, I want automatic As-You-Type formatting by default, so that common numbers look familiar without custom configuration.
29. As a product designer, I want declarative Display Masks, so that approved visual formats can be applied without replacing validation.
30. As an advanced library consumer, I want a typed Format Strategy with caret mapping, so that unusual presentation can be implemented safely.
31. As a developer, I want invalid Display Masks and Format Strategies detected in development, so that configuration errors do not create silent corruption.
32. As a checkout developer, I want a fixed-calling-code display mode, so that the country prefix cannot be accidentally edited.
33. As an international form developer, I want an editable international display mode, so that users can change country by entering a different prefix.
34. As a local-market developer, I want a national display mode with a selected country, so that familiar local formatting can be shown while storing the same Phone Value.
35. As an enterprise form developer, I want optional extensions stored separately, so that E.164 data and internal routing digits are not conflated.
36. As a developer, I want separate, inline, and custom extension presentation, so that different form layouts can share one data contract.
37. As a server developer, I want pure parse, validate, format, and RFC 3966 helpers, so that backend boundaries use the same semantics without importing React or MUI.
38. As a Next.js developer, I want deterministic SSR and hydration, so that the initial country, flag, and placeholder do not change after hydration.
39. As a privacy-conscious product owner, I want no network, storage, cookies, telemetry, GeoIP, or PII logging by default, so that adding the component does not create hidden data flows.
40. As a performance-conscious developer, I want flags, locales, country options, and metadata to avoid unnecessary initial JavaScript, so that standard forms remain lightweight.
41. As an offline or strict-CSP product, I want local SVG flags by default, so that country icons do not depend on a third party.
42. As a bundle-sensitive product, I want external URL, emoji, and no-flag modes, so that I can choose a different asset trade-off explicitly.
43. As a branded product, I want a custom Flag Provider and flag slot, so that local assets or framework image components can be used.
44. As a localization owner, I want `Intl.DisplayNames`, replaceable messages, country-name resolvers, and tree-shakeable locale packs, so that the component works with any i18n framework.
45. As a React Hook Form user, I want an official element adapter, so that dirty, touched, focus-on-error, reset, async defaults, field arrays, server errors, and unregister behavior work correctly.
46. As a Zod user, I want schema factories for candidates, valid numbers, and numbers with extensions, so that form and server validation use the same contract.
47. As a developer using another form library, I want the core component to remain form-agnostic, so that I am not forced to install React Hook Form or Zod.
48. As a developer, I want controlled and uncontrolled modes with identical callbacks, so that simple and managed forms share behavior.
49. As a maintainer, I want development warnings for controlled-mode changes and conflicting props, so that misuse is detected early.
50. As an application developer, I want typed callbacks for value, country, validation, selector state, and extension changes, so that I do not inspect mutable events.
51. As a maintainer, I want one callback per committed Input Transaction, so that derived rendering does not create loops or duplicate side effects.
52. As a form user, I want validation computed continuously but shown after blur by default, so that incomplete typing is not immediately presented as an error.
53. As a product developer, I want to control validation visibility and messages, so that submit-driven and server-driven forms are supported.
54. As a product owner, I want optional allowed-number-type restrictions, so that mobile-only or other policies can be explicit without changing default validity.
55. As a user, I want all valid number types accepted by default, so that legitimate landline and VoIP contacts are not rejected unexpectedly.
56. As a developer, I want max metadata as the strict default and compatible min, mobile, and custom entrypoints, so that bundle and validation trade-offs are explicit.
57. As a maintainer, I want validated custom metadata rather than hand-authored country tables, so that local customization cannot become a second numbering authority.
58. As a package consumer, I want ESM exports and correct TypeScript declarations, so that modern bundlers and editors resolve every entrypoint correctly.
59. As a package consumer, I want the packed npm tarball tested in real Next.js and Vite applications, so that workspace-only success cannot hide publication errors.
60. As a maintainer, I want browser-level interaction tests, so that caret, focus, paste, autofill, IME, CSS, and accessibility are validated in real engines.
61. As a maintainer, I want donor tests and issue regressions preserved, so that modernization does not discard years of known behavior.
62. As a contributor, I want an explicit Donor Decision for complex behavior, so that new code improves proven solutions rather than unknowingly repeating their failures.
63. As a release owner, I want bundle budgets, package validation, provenance, SBOM, and exact-candidate testing, so that releases remain operable and trustworthy.
64. As a maintainer, I want prerelease integration in RideOS and Christofle before 1.0, so that the API is proven in distinct real products.
65. As a user migrating from a custom field or another library, I want migration guidance, so that I can adopt the package without preserving legacy API inside the core.
66. As a consumer replacing a visual slot, I want prepared accessibility props and state, so that customization does not require reimplementing the complete interaction contract.
67. As a maintainer, I want an extension point admitted only when it is used internally, proven by two consumers, or required by a core boundary, so that maximum customization does not become an unmaintainable prop surface.
68. As a user entering an invalid number, I want a clear recoverable error rather than an exception, so that bad input never crashes a form.
69. As a developer supplying broken metadata or strategies, I want fail-fast configuration errors, so that false telephone semantics are not silently accepted.
70. As a product owner, I want documentation to distinguish structural validity from ownership and deliverability, so that the UI never claims a number exists or belongs to a user without external proof.

## Implementation Decisions

- Create one public repository and one published package with a clean history and no legacy API obligation.
- Target React 19+, MUI 9+, Emotion 11, TypeScript 6 declarations, Node 24+ tooling, ESM-only output, and modern evergreen browsers.
- Use `libphonenumber-js` as the only phone-number authority. Pin and verify the latest stable version at implementation time.
- Make max metadata the default and expose API-compatible min, mobile, and validated custom metadata entrypoints.
- Adapt mature phone-draft, smart-caret, normalization, and country-switching behavior from `react-phone-number-input` into typed internal modules rather than taking a runtime dependency on its React component.
- Use one Input Transaction state machine for keyboard input, paste, autofill, IME, country selection, external values, and reset.
- Expose a Phone Value containing only a leading `+` and digits, or `undefined` when empty. Preserve incomplete candidates during editing.
- Keep Extension as a separate digits-only canonical value and provide RFC 3966 helpers.
- Distinguish Selected, Detected, and Resolved Country and avoid premature resolution for shared calling codes.
- Support controlled and uncontrolled ownership through the same state machine and reject mode switching after mount.
- Provide international, national, and international-fixed-calling-code Display Formats without changing Phone Value.
- Provide automatic formatting, declarative Display Masks, and typed Format Strategies that return logical caret mapping. Do not expose an unsafe string-only formatter callback.
- Provide an accessible searchable and virtualized Country Selector with desktop Popper and mobile Dialog presentations, Preferred Countries, country filters, and replaceable ordering.
- Search countries by localized name, English name, ISO code, and calling code.
- Provide local generated SVG flags by default, plus external URL/CDN, emoji, none, custom Flag Provider, and custom flag slot modes.
- Source default flags from a pinned `country-flag-icons` release; do not maintain a manual flag set.
- Register `MuiPhoneInput` with MUI theme augmentation, default props, style overrides, variants, stable utility classes, stable semantic slots, slot props, and owner state.
- Publish a polished `MuiPhoneInput`, `usePhoneInput`, and supported Composable Primitives in the same package.
- Publish client, server, React Hook Form, Zod, metadata, locale, and flag subpath entrypoints. Keep optional integrations as optional peer dependencies.
- Keep server entrypoints free of React, MUI, Emotion, browser globals, and DOM code.
- Use `Intl.DisplayNames` as the default country-name source, with typed messages, resolvers, and tree-shakeable locale packs.
- Make WCAG 2.2 AA a release gate and provide mandatory accessibility props to official slots and primitives.
- Do not perform network requests, GeoIP, geolocation, storage, cookies, telemetry, OTP, carrier lookup, reachability checks, or PII logging by default.
- Use a responsive MUI-based visual default inspired by the successful unified-field behavior found in Christofle, but do not copy its global script, manual country table, direct DOM mutation, or duplicated implementations.
- Use a pnpm workspace with one package, a Next.js documentation/playground app, and real Next.js and Vite consumer applications.
- Use `tsdown` for ESM packaging and declaration generation, plus `publint`, Are The Types Wrong, packed-tarball installation, and export validation.
- Use Changesets and SemVer, prerelease dist-tags before 1.0, and deprecation before post-1.0 public API removal.
- Publish through GitHub Actions and npm Trusted Publishing/OIDC with provenance, staged stable releases, owner approval, dependency review, and SBOM/release manifests.
- Use Beads/Dolt as the sole library execution tracker, with `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and `wontfix` labels, real blocking dependencies, and the specification epic `mpi-oan` as the delivery root. Do not duplicate execution state in GitHub Issues or Discussions.
- Require exact Donor Decisions and retained regression tests for non-trivial behavior.
- Plan RideOS as the first Consumer Integration and Christofle as the second after its MUI 9 upgrade. The library-side external gate is `mpi-nfw`; implementation tasks remain in each product's own tracker.
- Freeze the 1.0 API only after both Consumer Integrations, API review, performance budgets, browser coverage, and manual screen-reader gates.

## Testing Decisions

The primary testing seam is the externally observable behavior of the packed and published `MuiPhoneInput` running in a real browser. Tests must assert user outcomes—displayed value, canonical callbacks, country and validation state, caret behavior, focus, keyboard navigation, error visibility, and accessibility—rather than internal hook structure.

The secondary testing seam is the pure Input Transaction engine. Donor tests for phone draft state, input normalization, caret movement, country switching, and known regressions are ported or adapted here, then extended for the package's explicit transaction reasons and formatting strategies.

Required coverage includes:

- keyboard insertion, replacement, Backspace, Delete, range selection, and edits around separators;
- paste of international, national, formatted, RFC 3966, Unicode-digit, invalid, and extension-bearing input;
- browser autofill and full-value replacement;
- composition events and IME safety;
- shared calling codes, explicit country priority, incompatible digits, and country switching;
- automatic formatting, Display Masks, Format Strategies, and logical caret preservation;
- empty, incomplete, possible, valid, invalid, number-type, and validation-display states;
- controlled, uncontrolled, reset, external update, and callback-loop behavior;
- Country Selector search, virtualization, responsive presentation, portals, keyboard behavior, and focus return;
- local, external, emoji, none, fallback, and custom flag modes;
- MUI variants, theme defaults, overrides, slots, owner state, light/dark, RTL, forced colors, reduced motion, zoom, disabled, read-only, error, and required states;
- extensions and RFC 3966 conversion;
- React Hook Form reset, async defaults, dirty/touched, field arrays, focus-on-error, server errors, and unregister behavior;
- Zod and server helper parity across metadata presets;
- deterministic Next.js SSR/hydration and Vite consumption;
- public TypeScript API and every package export;
- packed npm tarball installation rather than workspace-source resolution;
- bundle-size and initial-render budgets;
- Chromium checks on every pull request and Chromium, Firefox, and WebKit matrices on main, nightly, and release candidates;
- automated axe checks and manual VoiceOver/Safari, NVDA/Firefox, and JAWS/Chrome release gates before 1.0.

Prior art comes from the inspected donor test suites and issue histories, especially `react-phone-number-input` for phone draft and caret behavior, `mui-tel-input` for MUI composition and typed details, `react-phone-input-2` and `react-phone-input-material-ui` for configuration and regression catalogues, and the two Christofle implementations for integrated selector, placeholder, modal, address-country, and visual scenarios.

## Out of Scope

- Backward-compatible adapters for `react-phone-input-2`, `react-phone-input-material-ui`, `mui-tel-input`, or custom Christofle APIs.
- React 18 or older, MUI 8 or older, CommonJS, UMD, Babel runtime, and legacy-browser polyfills.
- React Native.
- Built-in Formik or TanStack Form adapters for 1.0.
- GeoIP, browser geolocation, timezone inference, or network-based country detection.
- OTP delivery, number ownership verification, reachability checks, carrier lookup, fraud scoring, or contact discovery.
- Persistence of recent countries, numbers, or user preferences.
- Telemetry, analytics, cookies, local storage, or session storage.
- A custom telephone numbering database, manually maintained country rules, or UI configuration that overrides calling-code semantics.
- Vanity-number interpretation or extraction of one number from arbitrary prose.
- A separate Storybook application for 1.0.
- Automatic migration of RideOS or Christofle as part of the library repository.

## Further Notes

- The intended GitHub repository owner was described as `whiteee`; the available authenticated GitHub profile is `wh1teee` and matches the owner's name. The repository currently lives under `wh1teee`. Transfer remains possible if the other account is intentionally required.
- The target npm name is `@whiteee/mui-phone-input`, but npm scope ownership is a human release gate that must be verified before publishing.
- Exact dependency versions are intentionally not frozen in this specification. Every implementation ticket must verify and pin current stable versions under the project's support and minimum-release-age policy.
- Initial bundle targets are 25 KB gzip for the main entrypoint excluding peer dependencies, metadata, and flag assets, and 10 KB gzip for the server entrypoint excluding metadata. The first tracer implementation must measure and calibrate these limits; later increases require an explicit documented decision.
- The expected release sequence is core tracer, masks and extensions, integrations and entrypoints, accessibility/browser hardening, RideOS integration, Christofle integration, API freeze, and 1.0.
- A custom extension point is accepted only when used by the built-in implementation, proven by two distinct Consumer Integrations, or necessary for accessibility, MUI composition, or the client/server boundary.

