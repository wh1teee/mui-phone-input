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

## Public API

- Use stable MUI-style `slots`, `slotProps`, utility classes, `ownerState`, theme `defaultProps`, `styleOverrides`, and `variants`.
- Do not add multiple configuration paths for the same behavior.
- Use discriminated unions or strategy objects for mutually exclusive or complex behavior.
- A public extension point must be used by the built-in implementation, validated by two real Consumer Integrations, or required for accessibility, MUI composition, or the server boundary.
- Public API changes require a changeset. Hard-to-reverse or surprising architectural changes require an ADR.

## Issue triage

Beads/Dolt is the sole execution tracker. The root delivery epic is `mpi-oan`, and all implementation work must be created or linked beneath it unless it is independently discovered work.

Use these labels consistently:

- `needs-triage`
- `needs-info`
- `ready-for-agent`
- `ready-for-human`
- `wontfix`

Use blocking dependencies for execution order, `discovered-from` for work found during implementation, and `bd human` for irreducible owner gates. GitHub Issues and Discussions are not execution trackers for this project.

