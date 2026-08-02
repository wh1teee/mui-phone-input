# Typed country-transition evidence

Date: 2026-08-03
Bead: `mpi-oan.31`

## Public event boundary

`onCountryChange` reports changes in the public Numbering Plan country state,
not DOM events and not only selector actions. Its first argument is the next
resolved country or `null`. `PhoneCountryChangeDetails` contains:

- `reason`;
- `country` and `previousCountry` as next/previous resolved countries;
- complete `numberingPlan` and `previousNumberingPlan` values, including
  selected, detected, resolved and possible countries;
- canonical `value` and `previousValue`.

The reason vocabulary is `default`, `user`, `input`, `paste`,
`external-value`, and `reset`.

## Cardinality

The hook maintains one country-transition ledger. User commits update the
ledger synchronously before React reconciliation, so a controlled value render
cannot repeat the same transition as `external-value`. Reconciliation is
suppressed only when the accepted value and complete country state match the
user transition. A parent that accepts the value but rejects or changes the
controlled country produces one distinct `external-value` correction.
Independent prop changes are detected after render and emit once.

Numbering authority may legitimately move through several countries while a
shared-code draft becomes specific. For example, typing a complete US NANP
number produces the authority transitions `null → CA → null → US`; each
committed transition emits once rather than being collapsed into a session-level
event.

## Regression coverage

Real-browser tests cover:

- default-country initialization;
- explicit user selection;
- reset to the initial country;
- shared `+1` input transitions;
- formatted international paste;
- external controlled value changes;
- transition from geographic to non-geographic state;
- controlled country reconciliation without a duplicate callback;
- controlled rejection producing one explicit external correction;
- deterministic serializable previous/next numbering-plan details.

Exact packed Next.js and Vite consumers verify the `user` event through the
published component surface. The generated declaration is checked for the full
reason union and nullable callback signature.
