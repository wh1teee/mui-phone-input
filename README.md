# MUI Phone Input

A highly customizable, accessible phone input for React and Material UI, with `libphonenumber-js` as the only phone-number authority.

> Status: foundations, the Input Transaction bake-off, the production-shaped
> `MuiPhoneInput` tracer, numbering-plan resolution, and possible-by-default
> validation/server parity, MUI theme integration, `usePhoneInput`, composable
> primitives, and the basic responsive Country Selector are implemented on the
> delivery branch. npm publication remains blocked on the explicit owner gate
> `mpi-g7a`.

## Goals

- excellent zero-configuration behavior;
- deep customization through MUI theme integration, slots, strategies, hooks, and composable primitives;
- canonical E.164 values separated from display formatting;
- donor-first adaptation of proven input, caret, country-selection, and accessibility behavior;
- possible-by-default acceptance, strict validation as an explicit policy, and first-class non-geographic numbering plans;
- deterministic SSR, browser-grade interaction tests, and WCAG 2.2 AA release gates;
- one package with implemented client, server, and metadata entrypoints in the
  current canary, adding React Hook Form, Zod, locale, and flag entrypoints
  atomically with their owning feature slices.

The current export map contains `.`, `./server`, `./metadata/max`,
`./metadata/min`, `./metadata/mobile`, `./metadata/custom`, and
`./package.json`.
`./react-hook-form` and `./zod` remain owned by `mpi-oan.12`; `./flags/local`
and `./locales/en` remain owned by `mpi-oan.11`. These future paths are
intentionally absent rather than published as empty modules.

The canonical npm package name is `@wh1teee/mui-phone-input`, matching the
authenticated npm and GitHub identity. The first registry publication and
Trusted Publishing proof are tracked by the release gate `mpi-g7a`.

## Reporting problems

Use the public [Q&A intake](https://github.com/wh1teee/mui-phone-input/discussions/new?category=q-a)
for bug reports and support questions. Discussions are an intake and
communication surface only: maintainers create the canonical Bead under
`mpi-oan`, reply with its ID, and keep execution state exclusively in
Beads/Dolt.

## Runtime support

Repository installation, development, and release tooling require Node 24 LTS.
That maintainer requirement is intentionally not published as a package engine
constraint: browser consumers must not be rejected before their bundler can
consume the ESM entrypoint. Exact package tarballs are installed with
`engine-strict=true` and load both the main and neutral server entrypoints under
Node 22 and Node 24. Node 22 is the current demonstrated consumer runtime floor;
lower Node versions are not part of the support contract.

See the [product context](./CONTEXT.md), [architecture decisions](./docs/adr), [specification](./docs/specs/0001-mui-phone-input-1.0.md), [implementation-readiness research](./docs/research/2026-08-02-implementation-readiness-review.md), and [donor manifest](./DONORS.md).

Execution is tracked exclusively in Beads/Dolt under epic `mpi-oan`. Run
`bd show mpi-oan` for the complete delivery graph and `bd ready` for the live
frontier. Workspace foundations are recorded in `mpi-oan.1`, donor/corpus
evidence in `mpi-oan.2`, the Maskito engine decision in `mpi-oan.22` and ADR
0006, the minimal tracer in `mpi-oan.3`, numbering plans in `mpi-oan.4`, and
validation/server parity in `mpi-oan.10`. The shared MUI/composable contract is
recorded in `mpi-oan.6`; Country Selector authority and responsive behavior are
recorded in `mpi-oan.5`; exact Next.js SSR/hydration and packed Next/Vite proof
are recorded in `mpi-oan.13`. Stable semantic Country Selector slots and their
private implementation boundary are recorded in `mpi-oan.35` and the
[semantic-slot evidence](./docs/research/2026-08-03-country-selector-semantic-slots-evidence.md).

