# MUI Phone Input

A highly customizable, accessible phone input for React and Material UI, with `libphonenumber-js` as the only phone-number authority.

> Status: foundations, the Input Transaction bake-off, the production-shaped
> `MuiPhoneInput` tracer, numbering-plan resolution, and possible-by-default
> validation/server parity are implemented on the delivery branch. npm
> publication remains blocked on the explicit owner gate `mpi-g7a`.

## Goals

- excellent zero-configuration behavior;
- deep customization through MUI theme integration, slots, strategies, hooks, and composable primitives;
- canonical E.164 values separated from display formatting;
- donor-first adaptation of proven input, caret, country-selection, and accessibility behavior;
- possible-by-default acceptance, strict validation as an explicit policy, and first-class non-geographic numbering plans;
- deterministic SSR, browser-grade interaction tests, and WCAG 2.2 AA release gates;
- one package with client, server, React Hook Form, Zod, metadata, locale, and flag entrypoints.

The target npm package name is `@whiteee/mui-phone-input`. This machine is not authenticated to npm, so scope ownership and Trusted Publishing approval are tracked as the human release gate `mpi-g7a`; implementation may proceed, but registry publication may not.

See the [product context](./CONTEXT.md), [architecture decisions](./docs/adr), [specification](./docs/specs/0001-mui-phone-input-1.0.md), [implementation-readiness research](./docs/research/2026-08-02-implementation-readiness-review.md), and [donor manifest](./DONORS.md).

Execution is tracked exclusively in Beads/Dolt under epic `mpi-oan`. Run
`bd show mpi-oan` for the complete delivery graph and `bd ready` for the live
frontier. Workspace foundations are recorded in `mpi-oan.1`, donor/corpus
evidence in `mpi-oan.2`, the Maskito engine decision in `mpi-oan.22` and ADR
0006, the minimal tracer in `mpi-oan.3`, numbering plans in `mpi-oan.4`, and
validation/server parity in `mpi-oan.10`.

