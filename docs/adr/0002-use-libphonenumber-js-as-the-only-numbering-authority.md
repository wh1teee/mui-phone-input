# Use libphonenumber-js as the only numbering authority

Status: Accepted

`libphonenumber-js` metadata and APIs are the sole authority for parsing, country resolution, possibility, validity, and phone-number type. Display masks, flags, ordering, labels, and custom composition may change presentation, but they cannot redefine telephone numbering semantics.

## Consequences

- Phone Value is separated from Display Value;
- custom telephone semantics require validated custom metadata rather than UI configuration;
- the main package uses max metadata, with min, mobile, and custom entrypoints sharing the same API;
- client and server validation use the same pinned dependency and metadata preset;
- extensions remain separate from E.164 candidates.

