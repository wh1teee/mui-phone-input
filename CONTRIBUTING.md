# Contributing

## Project principles

1. Preserve correctness, accessibility, privacy, and public API clarity before convenience.
2. Use `libphonenumber-js` as the only telephone numbering authority.
3. Start with mature donor implementations and their issue histories before designing complex behavior.
4. Prefer a strong default and deep composable seams over many overlapping props.
5. Test user-visible interaction in real browsers; jsdom is not proof for caret, focus, paste, autofill, or composition behavior.

## Donor-first requirement

A pull request that introduces or replaces non-trivial phone input, caret, formatting, country selection, accessibility, form integration, SSR, or packaging behavior must update `DONORS.md` with:

- the donors inspected;
- exact commits and symbols;
- known relevant issues and tests;
- a `copy`, `adapt`, `pattern-only`, or `reject` decision;
- local regression tests preserving the accepted behavior;
- license and attribution actions.

Novel implementation is acceptable only when the pull request explains why the best relevant donor solution cannot be safely adapted.

Input and caret behavior requires the shared real-browser regression corpus. A contributor must not replace the selected Input Transaction engine or add a second masking path from isolated unit tests or a single-browser demo.

Changes to `libphonenumber-js`, metadata presets, country resolution, validation defaults, examples, or number types must include a semantic-difference report. Such changes are reviewed as behavior changes even when they arrive as dependency patches.

## Public API

- Use stable MUI-style `slots`, `slotProps`, utility classes, `ownerState`, theme `defaultProps`, `styleOverrides`, and `variants`.
- Do not add multiple configuration paths for the same behavior.
- Use discriminated unions or strategy objects for mutually exclusive or complex behavior.
- A public extension point must be used by the built-in implementation, validated by two real Consumer Integrations, or required for accessibility, MUI composition, or the server boundary.
- Public API changes require a changeset. Hard-to-reverse or surprising architectural changes require an ADR.
- Stable callback details describe committed domain state and reasons; they do not expose React SyntheticEvents or DOM Events. Low-level events remain available only through input slot props.

## Test requirements

- Use Vitest Node for pure state, parsing, formatting, server helpers, and property/model-based tests.
- Use Vitest Browser Mode for component behavior in a real browser; jsdom is not evidence for caret, focus, paste, autofill, or IME behavior.
- Run the blocking support matrix on Node 24 LTS, TypeScript 6, React 19, MUI 9, and the MUI 9 browser floor. Node 26, TypeScript 7, and future MUI prereleases are forward-looking non-blocking signals until separately accepted.
- The release path includes real iOS Safari and Android Chrome evidence when external open-source device infrastructure is available, plus recorded manual fallbacks for autofill, predictive keyboards, and assistive technologies.

## Issue triage

Beads/Dolt is the sole execution tracker. The root delivery epic is `mpi-oan`, and all implementation work must be created or linked beneath it unless it is independently discovered work.

Use these labels consistently:

- `needs-triage`
- `needs-info`
- `ready-for-agent`
- `ready-for-human`
- `wontfix`

Use blocking dependencies for execution order, `discovered-from` for work found during implementation, and `bd human` for irreducible owner gates. GitHub Issues and Discussions are not execution trackers for this project.

