# Donor Manifest

Every non-trivial capability must be evaluated against mature donors before implementation. A completed entry records exact provenance, known issues, tests retained locally, and one decision: `copy`, `adapt`, `pattern-only`, or `reject`.

## Research snapshot: 2026-08-02

| Donor | Inspected revision | Candidate capabilities | Initial direction |
| --- | --- | --- | --- |
| `catamphetamine/react-phone-number-input` | `dc64bded53adfbb23a31cede42168bea861a96f3` (`3.4.17`) | phone draft state, smart caret, country switching, input normalization, public composition seams | Adapt core behavior and tests into typed internal modules |
| `viclafouch/mui-tel-input` | `91f1df79c614` (`11.0.0`) | MUI field composition, typed change details, theme integration, country menu accessibility | Pattern-only and selectively adapt tests/API ideas |
| `harish50/react-phone-input-mui` | `d391709a83d55436a27041f70b0dea26e2ed9991` (`4.0.0` source) | masks, area codes, country filters, search, localization, MUI consumer expectations | Pattern-only; reject legacy class and telephone authority |
| `bl00mber/react-phone-input-2` | `39f787cf92b2ebb712b98cd8b62a3a7b38b5fde7` (`2.15.1`) | mature UX options, edge-case and issue catalogue | Pattern-only; mine tests/issues, reject stale internal phone data |
| `typesnippet/mui-phone-input` | `c44742e8e548` (`0.1.6`) | multi-MUI presentation ideas and mask API | Pattern-only or reject after capability-level review |
| Christofle PWA account and checkout phone fields | private consumer code inspected 2026-08-02 | unified field surface, country/address synchronization, example placeholder, modal-aware selector, visual polish | Adapt product requirements; reject global script, manual country table, direct DOM mutation |
| `catamphetamine/libphonenumber-js` | pin before implementation | parsing, E.164, country resolution, possibility, validity, number types, metadata generation | Direct runtime dependency and sole authority |
| `catamphetamine/country-flag-icons` | pin before implementation | local and external SVG flag sources | Build-time local source and opt-in external provider |

## Capability entry template

```text
Capability:
Donors inspected:
Exact commits and symbols:
Known issues:
Donor tests retained or adapted:
Decision: copy | adapt | pattern-only | reject
Reason:
Local regression coverage:
License and attribution action:
```

