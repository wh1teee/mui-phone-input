# Use a clean public repository and donor-first adaptation

Status: Accepted

The library starts in a clean public repository rather than inheriting the full history and public API obligations of an existing fork. Proven MIT-licensed behavior is adapted only after an exact Donor Decision records the source commit, symbols, tests, known issues, license obligations, and reason for copying, adapting, using as a pattern, or rejecting it.

## Consequences

- the project owns a modern API without legacy compatibility constraints;
- mature behavior and regression tests remain preferred over novel implementations;
- `DONORS.md` and retained license notices are release inputs rather than optional documentation;
- a complex capability cannot be reimplemented without first assessing relevant mature donors.

