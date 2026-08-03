# Browser focus serialization evidence

Date: 2026-08-03
Bead: `mpi-cgl`

## Root cause

The pinned Vitest Browser Mode runner enables browser file parallelism by
default. This repository has several independent files that exercise
`document.activeElement`, Popper click-away dismissal, native Tab order,
selection and form reset. Parallel files in one browser instance can therefore
steal focus from each other even though each test is isolated at the React
fixture level.

During `mpi-oan.49` verification the complete Firefox run first failed a
controlled focus assertion and passed immediately on rerun. Consecutive WebKit
runs then failed two different existing tests: Country Selector click-away and
uncontrolled form reset. The exact failing reset test passed in 289 ms when run
alone. Moving failures plus isolated success established test-runner focus
contention rather than a deterministic product defect.

The pinned Vitest CLI documents:

```text
--browser.fileParallelism
Should browser test files run in parallel. Use
--browser.fileParallelism=false to disable (default: true)
```

## Canonical contract

`vitest.browser.config.ts` now sets:

```ts
browser: {
  fileParallelism: false,
}
```

The repository-level `pnpm test:browser`, local verification and `ci:pr` all
load this same config. No test timeout, assertion, browser emulation or product
behavior changed. A unit workspace-contract test imports the actual config
object and fails if serialization is removed.

## Repeatability proof

The canonical `pnpm test:browser` command was executed twice per engine without
an override or rerun:

| Engine | Run 1 | Run 2 | Result |
| --- | ---: | ---: | --- |
| Chromium | 14.69 s | 16.60 s | 115/115 both runs |
| Firefox | 26.22 s | 18.74 s | 115/115 both runs |
| WebKit | 14.02 s | 13.78 s | 115/115 both runs |

All seven Browser Mode files passed on every run. The deterministic cost is a
small wall-time increase compared with unreliable parallel execution, while
browser instances and individual test behavior remain unchanged.

The unit suite now contains 94 tests, including the config contract.

