# Feature-complete package boundary evidence

Date: 2026-08-07
Bead: `mpi-oan.16`

## Contract

The release-candidate package is verified from one immutable packed `.tgz`.
That artifact is reused for publint, Are The Types Wrong, export/type checks,
published-runtime checks, package-size measurement, specialized consumers, and
the production-shaped Next.js/Vite consumers. Rebuilding between those stages
would invalidate the evidence.

The explicit feature-complete public API snapshot lives in
`scripts/lib/package-export-contract.mjs`. It freezes every supported package
subpath plus the exact runtime and TypeScript export-name sets. JavaScript
subpaths must also declare either a client or neutral boundary; the CSS and
`package.json` subpaths have explicit asset/data exceptions rather than empty
facades.

The packed manifest freezes the reviewed production dependency set:

- `@maskito/core@5.3.1`;
- `@maskito/react@5.3.1`;
- `libphonenumber-js@1.13.10`;
- `tabbable@6.5.0`.

React Hook Form and Zod remain the only optional integration peers. A clean
server-only consumer installs and imports `/server` without React or MUI; the
RHF-only consumer excludes Zod; the Zod-only consumer excludes React, MUI, and
RHF.

## Default network boundary

The neutral server graph is rejected if it acquires `fetch` or `WebSocket`.
Production Vite and Next.js browser proofs record the requests made by normal
default usage and fail on any HTTP(S) origin other than their own local
production server. The client bundle is deliberately not banned from containing
code for an explicit future network-backed flag option: the release contract is
that such network activity never occurs unless the consumer opts in. External
flag URLs therefore remain an explicit rendering opt-in instead of a default
data flow.

## Input interaction budget

The packed Vite consumer contains a controlled public `MuiPhoneInput` fixture.
The benchmark exercises normal browser interactions through that component:

- sequential typing;
- replacement in the middle of the display value;
- a real clipboard paste;
- Display Mask enable/disable transitions;
- Country Selector change;
- extension editing.

The initial feature-complete calibration on the development host measured
50.582 ms typing, 21.833 ms middle edit, 14.011 ms paste, 34.626/29.783 ms mask
enable/disable, 76.670 ms country change, and 16.868 ms extension editing. The
244.373 ms aggregate is protected by a 250 ms per-interaction ceiling and a
1,000 ms aggregate ceiling. These limits retain more than 3x headroom over the
slowest observed interaction while remaining tight enough to catch a material
public-pipeline regression.

The benchmark complements rather than replaces the `mpi-oan.23` Country
Selector calibration. Selector authority remains the standard MUI
`useAutocomplete` renderer, default `resultLimit=50`, no virtualization
dependency, and the existing 200 ms bounded-interaction envelope.

## Consumer support matrix

The exact tarball is exercised against both the latest and minimum supported
React 19 / MUI 9 peer matrices. The repository currently has one supported
Next.js package line (`16.2.12`); there is no separately declared older Next.js
minimum-version policy to invent for this gate. Both peer matrices therefore
use the production-shaped Next.js 16.2.12 consumer, while varying the published
React/MUI peer floor as already defined by the compatibility policy.
