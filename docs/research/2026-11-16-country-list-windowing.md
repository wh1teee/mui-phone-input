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

The window is private to the country list. A country-keyed size cache and linear
prefix offsets describe the finite option model; ResizeObserver batches mounted
row measurements without reading each row synchronously from its attachment ref.
Group spacing and natural row heights remain measured, and the scroll owner keeps
selected/highlighted targets and a visible anchor through size corrections.
No additional virtualization runtime is required.
The existing MUI renderer, phone model, locale aliases, controlled selection,
focus-return contract and public component props are unchanged.

## Historical TanStack candidate verification

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

## Private measured-window follow-up and transfer-cost calibration

The corrected packed-entrypoint fixture included the TanStack runtime in the
real client closure and measured `base-ui` at 100,431 gzip bytes against the
88,000-byte limit. That rejected candidate and its failed integrity/size checks
remain historical evidence. The final private owner removes TanStack and keeps
the same complete Base UI item model, group/spacer markup and public API.

Eight existing Chromium cases and the three browser-sensitive virtualization
cases in WebKit passed on the private-window source. They retain complete
245-country scroll/search/keyboard reachability while bounding mounted country
options below 48, and cover selected-country centering, dynamic wrapped heights,
group spacing, active-descendant mounting, host-owned selection/focus return and
the visible anchor through two natural resize deliveries after manual scrolling.
These are focused results, not a claim that the entire browser suite was rerun.

The later lazy-search change keeps each original option frozen and captures the
case locale, main-country boolean and a copy of aliases when options are created.
Only normalized search keys are deferred until the first nonempty query. Seven
existing unit cases passed for localized/English/calling-code matching, Turkish
casing, Japanese aliases, shared-code preference, empty-query order and result
limits. Scoped library types and named lint/format checks passed. First-query
latency was not benchmarked.

The retained final candidate tarball is 496,833 bytes, SHA256
`67bd0ba1207cbba86e14769631228945a3eaa5edac4c94ce3d4f556b9a8619a0`.
One canonical packed-entrypoint measurement reported all twelve
profiles. Six passed the previous limits; the six Base UI-family profiles below
failed both previous compressed-size limits. Those failures remain recorded:

| Profile | Actual gzip / previous limit | Actual Brotli / previous limit | Calibrated gzip / Brotli limits |
| --- | ---: | ---: | ---: |
| base-ui | 89,711 / 88,000 | 75,785 / 74,500 | 90,000 / 76,000 |
| shadcn | 89,711 / 88,000 | 75,785 / 74,500 | 90,000 / 76,000 |
| base-ui/react-hook-form | 89,321 / 88,000 | 75,417 / 74,500 | 90,000 / 76,000 |
| base-ui/min | 68,543 / 66,141 | 57,321 / 55,500 | 69,000 / 58,000 |
| shadcn/min | 68,543 / 66,141 | 57,321 / 55,500 | 69,000 / 58,000 |
| base-ui/min/react-hook-form | 68,165 / 66,500 | 56,949 / 56,000 | 69,000 / 58,000 |

The [specification's bundle-budget rule](../specs/0001-mui-phone-input-1.0.md#further-notes)
requires an explicit documented decision for later increases (line 224 in the
current specification). This section records that feature decision. The six
affected profiles exceeded the previous gzip limits by 1,321-2,402 bytes.
The calibrated limits leave at least 289 bytes of gzip and 215 bytes of Brotli
headroom; the tightest profile is the shared Base UI/shadcn max closure.

This calibration accepts the transfer cost of one private dynamic window in
exchange for bounded mounted rows with the full country set still reachable.
It does not claim that the implementation became smaller than the previous
limits. All six other profile limits remain unchanged. The measurement still
includes every shipped client chunk, uses Oxc and the same renderer/form peer
externalization, and checks renderer and metadata isolation. The verifier now
reports all twelve existing measurements before returning failure for any
compressed-size overflow; it retains the same comparisons and success shape.

A single canonical country-only consuming-fixture run on that artifact produced:

| Engine / viewport | First visible-row proxy | First DOM row | 100 ms result |
| --- | ---: | ---: | --- |
| Chromium / 390 px | 93.4 ms | 35.2 ms | PASS |
| Chromium / 1440 px | 42.9 ms | 25.6 ms | PASS |
| WebKit / 390 px | 333 ms | 74 ms | FAIL |
| WebKit / 1440 px | 71 ms | 40 ms | PASS |

Both engines passed the existing country/search/focus assertions. The consuming
helper, its 100 ms assertion and accepted drawer motion were unchanged; the
aggregate timing gate still exits with failure. The proxy samples transformed
viewport intersection plus the following animation frame, not physical paint.
These shared-host observations are not a controlled A/B comparison or evidence
for released 1.3.0, a live stand, physical Safari or VoiceOver.

No dependency, phone-validation, public API or motion policy changes are part
of this calibration. Package publication and tags require separate authorization; product adoption
awaits an authorized released version. The 100 ms mobile requirement remains unmet in WebKit.
