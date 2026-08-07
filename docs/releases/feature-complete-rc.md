This prerelease is the **feature-complete release candidate** for the MUI Phone
Input 1.0 program. It is published as `0.1.0-next.6` through the repository's
existing `next` prerelease channel. It is not a development canary, it is not a
stable 1.0 release, and it does not advance npm `latest`. Final validation must
install the exact version rather than relying on the mutable `next` dist-tag.

## Feature-complete scope

- canonical E.164 Phone Value transactions with controlled and uncontrolled ownership;
- geographic, shared-code, territory, unresolved, and non-geographic numbering plans;
- automatic formatting, Display Masks, fixed calling codes, extensions, and RFC 3966 conversion;
- accessible responsive Country Selector behavior, composable primitives, flags, and locale entrypoints;
- React Hook Form and Zod adapters with optional peer boundaries;
- max, min, mobile, and validated custom metadata entrypoints with client/server parity and semantic freshness checks;
- deterministic SSR/hydration and neutral `./server` helpers;
- feature-complete public exports, source maps, licenses/notices, package boundaries, and exact-tarball consumer proof;
- enforced main/server bundle budgets, packed-input interaction budgets, selector calibration, and no unexpected network behavior;
- interactive documentation/playground, migration guidance, theming examples, validation examples, and copyable TypeScript usage.

## Owner-accepted physical-device and AT residuals

The following release-gate rows were **NOT_AVAILABLE** and remain NOT_AVAILABLE;
they are not represented as PASS. The owner explicitly accepted these recorded
residual gaps for RC progression under Bead `mpi-oan.24` on 2026-08-07:

- physical iOS Safari, including VoiceOver and My Phone Number/Contacts autofill before/after hydration;
- physical Android Chrome, including OEM predictive keyboards, saved-number autofill, and SwiftKey prevented-backspace behavior;
- NVDA with Firefox;
- JAWS with Chrome.

Automated WCAG 2.2/browser evidence remains mandatory for this RC and is rerun
by the release workflow. The owner acceptance above does not convert unavailable
physical-device or assistive-technology evidence into a passing result.

## Remaining gates before stable 1.0

- exact-artifact RideOS RC validation: `mpi-oan.27`;
- owner-deferred Christofle validation: `mpi-oan.19`;
- explicit owner approval for stable 1.0 publication and any npm `latest` promotion.

Until those gates are complete, use the exact RC version for validation and do
not treat this prerelease as the stable package.
