# MUI Phone Input

A highly customizable, accessible phone input for React and Material UI, with `libphonenumber-js` as the only phone-number authority.

> Status: architecture and delivery planning. The package is not ready for production use yet.

## Goals

- excellent zero-configuration behavior;
- deep customization through MUI theme integration, slots, strategies, hooks, and composable primitives;
- canonical E.164 values separated from display formatting;
- donor-first adaptation of proven input, caret, country-selection, and accessibility behavior;
- deterministic SSR, browser-grade interaction tests, and WCAG 2.2 AA release gates;
- one package with client, server, React Hook Form, Zod, metadata, locale, and flag entrypoints.

The target npm package name is `@whiteee/mui-phone-input`, subject to verified npm scope ownership before the first publication.

See the [product context](./CONTEXT.md), [architecture decisions](./docs/adr), [specification](./docs/specs/0001-mui-phone-input-1.0.md), and [donor manifest](./DONORS.md).

Execution is tracked exclusively in Beads/Dolt under epic `mpi-oan`. Run `bd show mpi-oan` for the complete delivery graph and `bd ready` for the current frontier.

