# Measured Base UI country-list windowing

Date: 2026-11-16. Bead: `mpi-dyx`. Base: `2a2de05133c0b7e4189a829c21777b11418f650b`.

## Why the earlier calibration no longer settles this requirement

The 2026-08-07 calibration used a 200 ms envelope and originally capped the
normal list at 50 countries. Its 2026-10-04 addendum made the complete list the
default while retaining the earlier renderer. Neither decision measured the
new Base UI inline list in a consuming application's own mobile drawer.

PayAtTable's profile contract requires the complete searchable list and first
visible rows within 100 ms. Its production React fixture, using published
`@wh1teee/mui-phone-input@1.3.0`, measured 144.4 ms at 390 px and 71.8 ms at
1440 px in one run; the later integrated shared-CSS run measured 238.2/137.8 ms
on the shared host. Those are opening-to-visible-row measurements, not React
Profiler totals and not physical-device field performance.

CPU evidence identifies initial React option construction and registration as
the major cost. Existing content-visibility skips off-screen layout/paint, but
does not avoid creating the complete option tree. Hidden pre-mounting was tried
only in the consuming worktree, did not establish the budget, and was removed.

## Implementation boundary

The Base UI popover and public PhoneCountryList share one measured window.
Base UI keeps all matching options for search and keyboard navigation. Visible
rows, group boundaries, the current selection and the active descendant remain
mounted; normal-flow spacers account for the other rows. Options have natural
heights, including wrapped names at 200% text. No public result limit is added.

The exact TanStack Virtual dependency is externalized from library bundles.
The existing MUI renderer, phone model, locale aliases, controlled selection,
focus-return contract and public component props are unchanged.

## Verification

Source and test-project typechecks passed. Biome checked the nine changed
source/style/config/test files without errors or warnings. The workspace
contract check and one library package build passed.

Three named Chromium cases in `tests/browser/country-picker-parts.browser.test.tsx`
passed (37 unrelated cases skipped, 4.69 s total): complete scroll/search/keyboard
reachability, grouped inline rows with variable heights and mounted active
descendants, and initial visibility of a far-away selected country. The same
three WebKit cases passed (37 skipped, 3.51 s total). The first WebKit run sampled
the pinned active row before the newly scrolled viewport committed and missed
two countries during traversal. Waiting for the painted first viewport before
manual scrolling preserves the exact assertion that all 245 countries are seen;
the corrected run passes without changing the product or its reachable set.

The consuming production-React fixture kept product dependencies unchanged and
aliased only the candidate Base UI entrypoint and stylesheet in a temporary
measurement harness. Its Base UI and React instances remained the product's.
The complete country/search/focus checks passed; the aggregate performance gate
still failed on mobile. These single runs on a shared host are observations,
not a controlled benchmark or physical-device field data:

| Engine / viewport | Published 1.3.0 first visible rows | Candidate first visible rows | Candidate first DOM row |
| --- | ---: | ---: | ---: |
| Chromium / 390 px | 127.9 ms | 124.8 ms | 54.6 ms |
| Chromium / 1440 px | 71.6 ms | 43.4 ms | 28.0 ms |
| WebKit / 390 px | 469 ms | 359 ms | 87 ms |
| WebKit / 1440 px | 131 ms | 86 ms | 52 ms |

A separate geometry/CPU diagnostic confirms 18 mounted options in the mobile
drawer and 11 in the wide popover. The mobile first row starts below the viewport
while the existing host drawer enters. The headless WebKit diagnostic sampled
that motion at 104, 186 and 321 ms; it cannot establish physical Safari frame
cadence. No new motion value, hidden pre-mount or consuming-product workaround
was introduced. Further integrated mobile measurement remains open; this patch
removes complete-list mounting but does not claim to satisfy the 100 ms product
opening budget by itself. Physical Safari/VoiceOver is not verified.

Registry publication and release tags require separate owner authorization.
