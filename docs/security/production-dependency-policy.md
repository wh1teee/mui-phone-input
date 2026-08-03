# Production dependency security policy

The published library does not depend on Next.js, PostCSS, or sharp. They are
part of the production-shaped Next.js consumer used to prove that the exact
package tarball builds, renders on the server, hydrates, and behaves in a real
browser.

Next.js 16.2.12 declares PostCSS 8.4.31 and sharp ^0.34.5. The workspace applies
parent-scoped pnpm overrides only to that Next.js version:

- PostCSS 8.5.25, above the 8.5.18 floor required by
  `GHSA-r28c-9q8g-f849`;
- sharp 0.35.3, above the 0.35.0 floor required by
  `GHSA-f88m-g3jw-g9cj`.

`docs/security/production-dependency-policy.json` is the machine-readable
authority for the minimum and resolved versions. The same overrides are applied
inside the isolated Next.js tarball consumer; they do not alter the published
library manifest.

`pnpm verify:production-dependencies` fails when:

- a resolved production version is below its required floor;
- `pnpm audit --prod` reports an unaccepted advisory;
- any high or critical advisory is present, even if someone attempts to add it
  to the allowlist;
- an allowlist entry lacks a reason or has expired.

Only low or moderate advisories may be temporarily accepted. Each entry must
record its advisory identifier, a non-empty reason, and an ISO `expiresOn`
date. The current allowlist is empty.

The overrides should be removed after a supported stable Next.js release
resolves both dependencies at or above the policy floors and passes the same
packed-consumer evidence.
