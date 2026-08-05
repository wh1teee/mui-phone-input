# Server national-parser evidence

Date: 2026-08-05  
Bead: `mpi-oan.56`  
Discovered by: RideOS consumer Bead `rideos-a6a.67.2.1`

## Consumer gap

The `0.1.0-next.3` client could normalize complete national autofill under an
explicit country, but the neutral `/server` entrypoint exposed only
country-agnostic Phone Value parsing. RideOS therefore could not remove its
hand-written Belarus-only normalizer without either duplicating phone authority
or depending directly on `libphonenumber-js`.

## Public contract

`parseNationalPhoneValue(input, country)` is now exported from the root and
neutral server entrypoints. It is the same implementation used by the client
complete-field replacement path:

- parsing uses selected-country-only `libphonenumber-js` metadata;
- structural possibility is the acceptance boundary;
- explicit territory identity is preserved;
- possible-but-not-strictly-valid numbers remain accepted;
- partial, international, malformed, and structurally impossible input returns
  `null`.

No country table, Belarus-specific prefix rule, React dependency, browser API,
or second parser was added.

## Authority corpus

The public server import is covered by:

- all 245 pinned mobile examples;
- the parent-numbering-plan territories `AX`, `BL`, `CC`, `CX`, `EH`, `IM`,
  `MF`, `SJ`, and `VA`;
- possible-but-not-valid US and BY examples;
- supported Unicode decimal digits;
- Belarus trunk-prefix forms `80291234567`, `0291234567`, and
  `8 (029) 123-45-67`;
- invalid length, malformed input, partial input, and international misuse.

The Belarus trunk-prefix forms are interpreted by `libphonenumber-js` under
explicit `BY` metadata. No local transformation rule is required.

## Packed-consumer proof

The exact tarball Next.js server component and Vite production consumer both
import `parseNationalPhoneValue` from `@wh1teee/mui-phone-input/server` and
assert `80291234567` becomes `+375291234567`. Package export verification also
asserts the runtime and declaration name sets for both entrypoints.

Fresh pre-commit verification on the implementation diff passed:

- 162 unit tests, including all 245 authority examples;
- TypeScript checks for the package and test graph;
- semantic runtime/declaration export verification;
- production Next.js and Vite packed consumers on latest and minimum React 19 /
  MUI 9 peer matrices;
- main closure 23,785 bytes gzip against a 25,600-byte budget;
- neutral server entry 5,057 bytes gzip against a 10,240-byte budget.
