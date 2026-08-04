---
"@whiteee/mui-phone-input": patch
---

Stop advertising empty future subpaths in the early canary. The implemented
paths are `.`, `./server`, and `./package.json`. `./react-hook-form`, `./zod`,
`./flags/local`, `./locales/en`, `./metadata/max`, `./metadata/min`,
`./metadata/mobile`, and `./metadata/custom` remain intentionally absent until
their owning features ship with exact-tarball semantic export evidence.
