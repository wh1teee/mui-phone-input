# MUI Phone Input

A highly customizable, accessible phone input for React and Material UI, with `libphonenumber-js` as the only phone-number authority.

> Status: implementation-ready foundations. The public tracer remains blocked on the real-browser Input Transaction engine bake-off recorded in ADR 0005.

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

Execution is tracked exclusively in Beads/Dolt under epic `mpi-oan`. Run `bd show mpi-oan` for the complete delivery graph and `bd ready` for the current frontier. The first implementation tasks are `mpi-oan.1` and `mpi-oan.2`; the tracer is blocked on the input-engine bake-off `mpi-oan.22`.

