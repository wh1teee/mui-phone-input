# Documentation site

`apps/docs` is the public documentation application for
`@wh1teee/mui-phone-input`. It is a Next.js App Router workspace that imports the
real package through `workspace:*`; it does not carry a copied phone parser,
country table, formatter, or validation implementation.

## Local and production builds

Run installs from the repository root so pnpm can resolve the workspace graph:

```bash
pnpm install --frozen-lockfile
pnpm docs:typecheck
pnpm docs:build
pnpm docs:test
```

`pnpm docs:build` first builds the publishable package and then builds this
Next.js application. That order is part of the deployment contract: a fresh
checkout must not depend on a pre-existing `packages/mui-phone-input/dist` from a
developer machine.

## Canonical deployment: Vercel

Vercel is the canonical target for this Next.js application. Configure one
project for the monorepo with:

- **Root Directory:** `apps/docs`
- **Install Command:** use Vercel's detected pnpm workspace install
- **Build Command:** `pnpm --filter @wh1teee/mui-phone-input build && pnpm build`
- **Framework Preset:** Next.js
- **Node.js:** a version supported by the repository's pinned Next.js release

Set `NEXT_PUBLIC_DOCS_URL` to the final HTTPS origin, without a trailing path,
for example `https://docs.example.com`. The root layout only emits canonical and
Open Graph absolute URL metadata when this variable is present, so preview/local
builds do not claim a fake production origin.

No `vercel.json` is required: the app uses standard Next.js output and the only
monorepo-specific requirement is building the workspace package before `next
build`.

## GitHub Pages evaluation

The current application is intentionally not configured to deploy to GitHub
Pages. Modern Next.js can statically export App Router pages with `output:
'export'`, and this docs app does not currently require request-time APIs. The
default GitHub Pages project URL, however, is served below a repository subpath.
This site deliberately uses root-relative documentation links and the normal
Next.js production server contract; adding a Pages-only `basePath`, asset path,
link rewriting, static-server test profile, and deployment workflow would create
a second deployment topology to maintain.

For that reason Vercel remains the single supported deployment target. Revisit a
Pages profile only if an owner explicitly wants that second topology; do not turn
on static export merely to obtain a Pages artifact.

## Deployment authorization

These files prepare and verify a deployable site. They do not authorize a public
deployment. Publishing the Vercel project, changing DNS, or enabling GitHub Pages
requires separate owner authorization.
