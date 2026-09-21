# Phone Input — MUI, Base UI and shadcn

A highly customizable, accessible phone input for React, MUI and Base UI, with `libphonenumber-js` as the only phone-number authority.

The package supports Material UI and Base UI/shadcn over one phone-editing engine.
The existing npm identity and MUI imports remain compatible. New consumers select
an explicit UI entrypoint instead of installing a second implementation. See
[the multi-adapter guide](./docs/guides/ui-adapters.md) and
[ADR 0007](./docs/adr/0007-share-phone-state-across-independent-ui-adapters.md).

The stable channel is `@wh1teee/mui-phone-input@latest`. The historical
`0.1.0-next.x` line remains available only for reproducibility; new production
adoptions should use the stable major or an exact version.

## Goals

- excellent zero-configuration behavior;
- deep customization through MUI theme integration, slots, strategies, hooks, and composable primitives;
- canonical E.164 values separated from display formatting;
- donor-first adaptation of proven input, caret, country-selection, and accessibility behavior;
- possible-by-default acceptance, strict validation as an explicit policy, and first-class non-geographic numbering plans;
- deterministic SSR, browser-grade interaction tests, and WCAG 2.2 AA release gates;
- one package with implemented client, server, metadata, React Hook Form, Zod,
  locale, and flag entrypoints, while keeping integrations independently
  tree-shakeable and optional.

The public export map preserves the root MUI API and adds `/mui`, `/headless`,
`/base-ui`, `/shadcn`, renderer-specific React Hook Form paths and an opt-in
`/shadcn.css` skin. Every browser renderer also has a `/min` variant that uses
the smaller official `libphonenumber-js` metadata graph. Server, metadata,
flags, locale packs and Zod remain independent. Each renderer requires only its
own optional peers.

Exact-artifact bundle gates measure package-owned closures with runtime phone
dependencies and metadata included, while leaving the application's React/UI
peers external. The `/min` entries reduce the current phone closure by roughly
21–22 KiB gzip without importing another renderer. Next.js App Router proof uses
normal package exports and package-owned client boundaries; no
`transpilePackages`, `serverExternalPackages`, or experimental package-import
rewriting is required.

The canonical npm identity remains `@wh1teee/mui-phone-input`. The original
publishing identity gate `mpi-g7a` is closed; subsequent releases continue using
the existing trusted-publishing, exact-artifact and provenance workflow.

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

