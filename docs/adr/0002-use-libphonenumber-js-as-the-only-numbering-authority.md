# Use libphonenumber-js as the only numbering authority with possible-by-default acceptance

Status: Accepted

`libphonenumber-js` metadata and APIs are the sole authority for parsing, numbering-plan resolution, possibility, validity, and phone-number type. Display masks, flags, ordering, labels, and custom composition may change presentation, but they cannot redefine telephone numbering semantics.

The package computes both possibility and strict validity, but its default acceptance policy is `possible`. Strict `valid` and number-type policies remain explicit because metadata can temporarily lag newly assigned number ranges. Geographic, ambiguous shared-code, and non-geographic numbering plans are all first-class outcomes; the package never invents a country for a non-geographic number.

## Consequences

- Phone Value is separated from Display Value;
- custom telephone semantics require validated custom metadata rather than UI configuration;
- the main package uses max metadata, with min, mobile, and custom entrypoints sharing the same API;
- client and server validation use the same pinned dependency, metadata preset, and Validation Mode;
- Numbering Plan Resolution exposes geographic, non-geographic, and unresolved states plus Possible Countries for shared calling codes;
- metadata updates produce a semantic-difference report and are not auto-merged when number acceptance, country resolution, type, or examples change;
- extensions remain separate from E.164 candidates.

