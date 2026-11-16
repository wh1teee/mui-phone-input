# Production dependency security policy

The published library does not depend on Next.js, PostCSS, or sharp. They are
part of the production-shaped Next.js consumer used to prove that the exact
package tarball builds, renders on the server, hydrates, and behaves in a real
browser.

The verification apps use Next.js 16.4.1. Its declared PostCSS and sharp ranges
resolve above the current policy floors without parent-scoped overrides:

- Next.js must remain at or above 16.4.1, the patched floor for the critical
  remote code execution advisories `GHSA-2464-fhr4-w9xw` and
  `GHSA-673q-mjm6-r5xr` and the App Router denial of service
  `GHSA-p3m5-59mp-jv5r` (16.3.6 already fixed `GHSA-vcvr-r3jv-pc5j`);
- PostCSS must remain at or above 8.5.18, the patched floor for
  `GHSA-r28c-9q8g-f849`;
- sharp must remain at or above 0.35.5, the patched floor for
  `GHSA-wq5f-xc86-pv6w` (0.35.4 fixed `GHSA-rgj7-g3m4-5g8c`).

`docs/security/production-dependency-policy.json` is the machine-readable
authority for minimum versions and any narrowly scoped override that might be
required in the future. The current override set is empty. The isolated Next.js
tarball consumer installs the same supported framework line independently; none
of this alters the published library manifest.

`pnpm verify:production-dependencies` fails when:

- a resolved production version is below its required floor;
- `pnpm audit --prod` reports an unaccepted advisory;
- any high or critical advisory is present, even if someone attempts to add it
  to the allowlist;
- an allowlist entry lacks a reason or has expired.

Only low or moderate advisories may be temporarily accepted. Each entry must
record its advisory identifier, a non-empty reason, and an ISO `expiresOn`
date. The current allowlist is empty.

Any future override must remain parent-scoped, meet the policy floor, and be
removed again once a supported framework release resolves the dependency safely.
