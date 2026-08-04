This is an **intentionally narrow** production-shaped canary for integration
feedback. It is published only under the `next` dist-tag and is **not promoted
to `latest`**.

## Included

- canonical E.164 Phone Value transactions with controlled and uncontrolled ownership;
- Material UI component, controller and composable primitives;
- responsive accessible Country Selector with lossless country transitions;
- authority-backed geographic, shared-code, territory, unresolved and non-geographic plans;
- possible-by-default validation with explicit strict and number-type policies;
- deterministic SSR/hydration and neutral `./server` helpers;
- localized selector ordering, localized-name search and decimal calling-code input;
- package-owned React client boundaries and exact-tarball Next.js/Vite evidence.

## Intentionally absent

- React Hook Form (RHF) and Zod adapter subpaths;
- metadata presets and custom metadata entrypoints;
- bundled locale and local-flag entrypoints;
- extension fields, advanced display modes and masks;
- selector virtualization and feature-complete performance claims;
- final real-device and assistive-technology certification.

Only these public paths are available: `.`, `./server`, and `./package.json`.
Missing future paths fail with `ERR_PACKAGE_PATH_NOT_EXPORTED` rather than
exposing placeholder modules.

Install explicitly with:

```bash
pnpm add @wh1teee/mui-phone-input@next
```
