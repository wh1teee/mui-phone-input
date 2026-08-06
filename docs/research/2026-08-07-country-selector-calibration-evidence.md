# Country Selector calibration evidence

Date: 2026-08-07
Bead: `mpi-oan.23`
Base: `898f40f0898964d34aea829532f1a9979add616d`

## Decision

Keep the standard MUI `useAutocomplete` renderer and the existing default
`resultLimit=50`. Do not add a virtualization dependency or a second listbox
renderer.

The bounded product path stays inside the interaction budget on Chromium,
Firefox, and WebKit. Rendering all 245 authority-backed countries is measurably
more expensive, but that is an explicit non-default stress case rather than the
normal selector contract. Adding virtualization to solve that opt-in stress
case would add listbox, active-descendant, grouping, reflow, portal, and screen
reader risk without improving the default path.

## Method

`tests/browser/country-selector-calibration.browser.test.tsx` measures the real
component with React Profiler inside Vitest Browser Mode. The same harness runs
against Chromium, Firefox, and WebKit and covers:

- the default 50-result desktop Popper;
- the complete 245-country list as a stress case;
- common text, calling-code, and localized-name filters;
- four deduplicated preferred countries;
- German localized names and generated local flag assets;
- default and complete-list mobile Dialog rendering;
- `End` keyboard navigation and active-option scrolling;
- 200% root text zoom/reflow;
- listbox/option semantics and `aria-activedescendant` visibility.

The complete-list case is also a practical low-end proxy: it renders 4.9 times
the default option count with all local flags. Portable heap sampling and CPU
throttling are not equivalent across the three browser engines, so memory is
recorded as DOM-node pressure rather than a Chromium-only heap number.

## Representative measurements

React Profiler values are milliseconds. `max` is the longest individual render
commit and `total` is the sum of commits for the measured interaction.

| Browser | Desktop 50 open max / total | `united` | `+375` | `Deutschland` | Desktop 245 open max / total | Keyboard settle | 200% reflow settle | Mobile 245 open max / total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Chromium | 41 / 120.8 | 5.3 | 4 | 3.8 | 116.8 / 306.6 | 32 | 33.4 | 33.5 / 90.4 |
| Firefox | 42 / 115 | 5 | 6 | 4 | 132 / 263 | 30 | 38 | 114 / 270 |
| WebKit | 73 / 150 | 5 | 2 | 1 | 119 / 220 | 25 | 226 | 70 / 146 |

The final harness additionally verifies the bounded 50-result mobile Dialog in
all three engines. The complete 245-country desktop list adds 1,485 DOM nodes;
the default path renders only 50 options. The complete list contains 245 unique
country options, four preferred options, and 246 local-flag elements including
the trigger flag.

The calibration budget is a 200 ms responsiveness envelope for the normal
bounded interaction, with filtering expected to remain comfortably below one
50 ms long-task interval. The measured default desktop render totals are
115–150 ms, the longest default commit is 73 ms, and measured filter updates
are 1–6 ms. Full-list rendering crosses the bounded-path budget in aggregate,
which validates keeping the existing result limit rather than making all 245
rows the default.

## Reflow defects found during calibration

The first red calibration run found that an option highlighted with `End`
remained referenced by `aria-activedescendant` after 200% text zoom but moved
outside the visible listbox. In the Chromium reproduction the active option's
bottom was 545 px while the listbox bottom was 443 px; the listbox still had
102 px of available scroll range.

The selector now rechecks active-option visibility after viewport or observed
list/group reflow and adjusts only the listbox scroll position. This keeps the
MUI highlight and ARIA authority intact rather than introducing a second
navigation model.

Firefox also exposed horizontal overflow for the German localized names of HK
and MO at 200% text zoom: the 360 px listbox had a 413 px scroll width. Allowing
the option-label grid cell to wrap long localized words removes that overflow.
After the fix all three engines keep the active option visible and report no
horizontal listbox overflow at 200% text zoom.

## Accessibility and browser contract

The calibration harness is additive to the existing selector suites. Existing
browser coverage proves the prepared MUI listbox/option roles,
`aria-activedescendant`, preferred groups, keyboard navigation, desktop Popper,
mobile Dialog, focus containment/return, portal policies, local flags, and
localized search. Axe coverage remains in the selector no-portal and flags
suites.

Headless WebKit is not a substitute for physical Safari + VoiceOver, and the
automated run does not claim the later real-screen-reader release gate. This
Bead preserves the existing semantic renderer instead of introducing a second
virtualized accessibility path.

## Exact-tip verification note

The selector-focused browser regression set passes as four serialized files in
each of Chromium, Firefox, and WebKit:

- `country-selector-calibration.browser.test.tsx`;
- `country-selector.browser.test.tsx`;
- `country-selector-mobile-no-portal-a11y.browser.test.tsx`;
- `flags-localization.browser.test.tsx`.

The complete Browser Mode suite passes 12 serialized files in Chromium and 12
in WebKit. The complete Firefox run reaches one pre-existing timeout in
`mui-phone-input.browser.test.tsx` for controlled Belarus keyboard input using
Arabic-Indic digits. The same isolated test fails at the same assertion on the
clean dispatch base `898f40f0898964d34aea829532f1a9979add616d`, so it is not a
selector-calibration regression. Follow-up bug `mpi-d7s` owns that Firefox
input-engine defect; no timeout or browser gate was weakened here.

The remaining exact working-tree gates pass: 178 unit tests, typecheck, lint,
build, production-dependency verification, and packed-package verification.

## Package cost

No production dependency or lockfile change is introduced. In particular,
there is no virtualization runtime.

Current built artifact measurements:

| Artifact | Raw | gzip | brotli |
| --- | ---: | ---: | ---: |
| `dist/index.js` | 128,981 B | 26,587 B | 22,353 B |
| `dist/server.js` | 21,297 B | 5,284 B | 4,638 B |

Packed `@wh1teee/mui-phone-input@0.1.0-next.5`: 177,111 bytes.

Runtime dependencies remain exactly `@maskito/core@5.3.1`,
`@maskito/react@5.3.1`, `libphonenumber-js@1.13.10`, and `tabbable@6.5.0`.

## Conclusion

Virtualization is not justified for the current product contract. The existing
50-result bound is the effective performance control, while the standard MUI
listbox keeps one semantic implementation across desktop, mobile, portals,
keyboard navigation, localization, flags, zoom, and screen-reader automation.
Reconsider virtualization only if a future product requirement makes the full
country list the normal rendered state or target-device evidence shows the
bounded path exceeding the interaction budget.
