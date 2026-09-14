# Work PC shared-GVS docs verification

The Work PC keeps pnpm's experimental Global Virtual Store enabled and places
its shared dependency graph below `/var/cache/ci/pnpm`. The repository normally
lives below `/home`, so the real Next.js package and the docs source have only
`/` as a common ancestor. Using `/` as `turbopack.root` would make Turbopack scan
an unbounded filesystem and is intentionally rejected.

The canonical `pnpm docs:build`, `pnpm docs:typecheck`, `pnpm docs:test`, and
`pnpm docs:ci` commands resolve the real Next.js package before running:

- a conventional installation with Next.js inside the repository runs in place;
- an already bounded shared-GVS workspace runs in place with the smallest common
  Turbopack root;
- a split `/home` + `/var/cache` Work PC checkout is copied to a temporary
  workspace below the shared pnpm root, installed from the same Global Virtual
  Store, verified there, and removed afterward.

This is not a private project store and does not disable GVS, switch to Webpack,
set `turbopack.root` to `/`, or weaken TypeScript with `skipLibCheck`. Workspace
`packageExtensions` add only the type and transitive dependency edges that pnpm's
shared realpaths otherwise hide from Next.js, MUI, Emotion, and React Hook Form.
The published library manifest is unchanged.

Set `MUI_PHONE_INPUT_KEEP_GVS_STAGE=1` only while diagnosing a failed local run;
the normal contract deletes the temporary workspace on success or failure.
