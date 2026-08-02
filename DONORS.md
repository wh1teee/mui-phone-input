# Donor Manifest

Every non-trivial capability must be evaluated against mature donors before implementation. A completed entry records exact provenance, known issues, tests retained locally, and one decision: `copy`, `adapt`, `pattern-only`, or `reject`.

## Research snapshot: 2026-08-02

Donors are reviewed per capability rather than receiving one repository-wide verdict. Tier 1 donors define architecture, standards, or regression behavior; Tier 2 donors contribute API, UX, and product patterns.

| Tier | Donor | Inspected revision | Candidate capabilities | Initial direction |
| --- | --- | --- | --- | --- |
| 1 | `catamphetamine/libphonenumber-js` | pin before implementation | parsing, E.164, numbering-plan resolution, possibility, validity, number types, metadata generation | Direct runtime dependency and sole authority |
| 1 | `taiga-family/maskito` | pin in `mpi-oan.2` | beforeinput/input processing, caret and selection, paste, autofill, composition, React integration, phone addon | Input-engine bake-off candidate A; dependency preferred over copied general-purpose core if it passes |
| 1 | `catamphetamine/react-phone-number-input` | `dc64bded53adfbb23a31cede42168bea861a96f3` (`3.4.17`) | phone draft state, smart caret, country switching, input normalization, public composition seams | Input-engine bake-off candidate B; adapt behavior/tests only after comparison |
| 1 | `jackocnr/intl-tel-input` | pin in `mpi-oan.2` | country search, keyboard navigation, validation errors, examples, RTL, alternative numerals, mature browser regression corpus | Behavior and regression donor; reject global runtime ownership |
| 1 | Material UI 9 and WAI-ARIA APG | version/spec revisions pinned in `mpi-oan.2` | MUI composition, slots, portal behavior, browser floor, combobox/listbox accessibility | Standards and platform authority |
| 2 | `viclafouch/mui-tel-input` | `91f1df79c614` (`11.0.0`) | MUI field composition, typed change details, theme integration, country menu accessibility | Pattern-only and selectively adapt tests/API ideas |
| 2 | `harish50/react-phone-input-mui` | `d391709a83d55436a27041f70b0dea26e2ed9991` (`4.0.0` source) | masks, area codes, country filters, search, localization, MUI consumer expectations | Pattern-only; reject legacy class and telephone authority |
| 2 | `bl00mber/react-phone-input-2` | `39f787cf92b2ebb712b98cd8b62a3a7b38b5fde7` (`2.15.1`) | mature UX options, edge-case and issue catalogue | Pattern-only; mine tests/issues, reject stale internal phone data |
| 2 | `typesnippet/mui-phone-input` | `c44742e8e548` (`0.1.6`) | multi-MUI presentation ideas and mask API | Pattern-only or reject after capability-level review |
| 2 | `goveo/react-international-phone` | pin in `mpi-oan.2` | modern headless hook, caret scenarios, dependency-light API | Pattern-only and regression donor |
| 2 | `uNmAnNeR/imaskjs` | pin in `mpi-oan.2` | mature masking architecture, dynamic masks, selection and overwrite behavior | Pattern-only and bake-off comparison input |
| 2 | Christofle PWA account and checkout phone fields | private consumer code inspected 2026-08-02 | unified field surface, country/address synchronization, example placeholder, modal-aware selector, visual polish | Adapt product requirements; reject global script, manual country table, direct DOM mutation |
| 2 | `catamphetamine/country-flag-icons` | pin before implementation | local and external SVG flag sources | Build-time local source and opt-in external provider |

`mpi-oan.2` must pin every revision and add exact symbols, tests, issues, licenses, and capability-level decisions before replacement implementation starts.

## Capability entry template

```text
Capability:
Tier:
Donors inspected:
Exact commits and symbols:
Known issues:
Donor tests retained or adapted:
Decision: copy | adapt | pattern-only | reject
Reason:
Local regression coverage:
License and attribution action:
```

