# Implementation-readiness review — 2026-08-02

This review records the primary-source evidence behind the final pre-implementation amendments. It is architecture evidence, not a second task tracker; Beads remains the execution authority.

## Accepted findings

### Input engine must be selected by a browser bake-off

Maskito is a zero-dependency, framework-agnostic input engine whose processors run around `beforeinput` and `input`. It provides React integration and an optional phone addon based on `libphonenumber-js`, including international and national formatting and lazy/custom metadata. This makes it a credible runtime foundation, but the project must compare it against an adaptation of `react-phone-number-input` and `input-format` using the same MUI/browser corpus before choosing.

Sources:

- https://maskito.dev/getting-started/maskito-libraries/
- https://maskito.dev/core-concepts/processors/
- https://maskito.dev/addons/phone/

### Possibility is the default acceptance policy

`libphonenumber-js` distinguishes `isPossible()` (length) from `isValid()` (length and digit-pattern metadata). Its maintainer explicitly recommends possibility for long-lived applications when strict metadata could become stale and reject newly assigned ranges. The package therefore computes both but defaults to `validationMode="possible"`.

Source: https://github.com/catamphetamine/libphonenumber-js

### Numbering plans are not always countries

`libphonenumber-js` represents non-geographic international plans with `country === undefined` and `isNonGeographic() === true`. It also exposes `getPossibleCountries()` for unresolved shared calling codes. Country state alone is therefore insufficient; the public model needs geographic, non-geographic, and unresolved Numbering Plan Resolution.

Source: https://github.com/catamphetamine/libphonenumber-js

### Country-list virtualization is evidence-driven

MUI's own Autocomplete country example uses the ordinary country set, while custom listbox implementations must preserve the listbox role and keyboard scroll behavior. MUI also documents `disablePortal` as an iOS VoiceOver workaround. The default selector should therefore start with standard rendering and bounded results; virtualization becomes an optional measured implementation only if target-device benchmarks justify it.

Sources:

- https://mui.com/material-ui/react-autocomplete/
- https://mui.com/material-ui/migration/upgrade-to-v9/

### Toolchain and browser matrices must distinguish blocking and forward signals

Node 24 is LTS while Node 26 is Current; Node recommends LTS for production use. MUI 9 targets Chrome 117, Edge 121, Firefox 121, and Safari/iOS Safari 17. The blocking matrix uses Node 24, TypeScript 6, React 19, and MUI 9 minimum/latest combinations. Node 26, TypeScript 7, and future MUI prereleases remain non-blocking forward checks.

Sources:

- https://nodejs.org/en/about/previous-releases
- https://mui.com/material-ui/getting-started/supported-platforms/

### Client and server bundles need explicit tsdown platforms

`tsdown` defaults to the Node platform. Client entrypoints must explicitly target `browser`; universal server-safe helpers use `neutral`. `publint` and Are The Types Wrong are integrated package-validation gates.

Sources:

- https://tsdown.dev/options/platform
- https://tsdown.dev/options/lint

### Real browser and real device evidence are distinct

Vitest recommends Browser Mode for component testing because it runs with real DOM implementations, rendering, events, focus, and browser APIs. BrowserStack offers an open-source program and Playwright execution on real iOS Safari devices, which can expose mobile Safari behavior missed by desktop WebKit emulation.

Sources:

- https://vitest.dev/guide/browser/component-testing.html
- https://www.browserstack.com/open-source
- https://www.browserstack.com/docs/automate/playwright/playwright-ios/nodejs

## Resulting delivery changes

- Add a blocking Input Transaction engine bake-off before the minimal tracer.
- Publish an early production-shaped `next` canary and integrate it in RideOS before masks, extensions, complete adapters, and release polish.
- Revalidate a feature-complete release candidate in RideOS and Christofle before 1.0.
- Split the basic Country Selector from measured optional virtualization.
- Add property/model-based tests and real-device evidence gates.
- Add metadata semantic-difference automation and npm scope ownership preflight.

## Local package-identity evidence

On 2026-08-02, `npm whoami` returned `E401 Unauthorized` on the implementation host. An unauthenticated lookup found no published `@whiteee/mui-phone-input` package, but absence does not prove scope ownership. Bead `mpi-g7a` is the human gate for authenticated npm identity, `@whiteee` scope control, canonical-name approval, and Trusted Publishing ownership before the early registry canary.
