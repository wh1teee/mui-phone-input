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

## Initial ownership provenance

The first transition reason is derived from the same ownership refs that govern
the canonical value and selected country:

- a controlled `value` and/or controlled `selectedCountry` is
  `external-value`;
- an uncontrolled `defaultValue` and/or `defaultCountry` is `default`;
- an empty initial state updates the internal ledger but emits no spurious
  country event;
- when controlled and default props conflict, the existing controlled-ownership
  diagnostic remains and the emitted transition follows the controlled source.

The implementation does not infer `default` merely because a transition is the
first effect. Ownership is fixed at mount, so the initial reason remains stable
through Strict Mode and later renders.

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

- initial controlled value and selected-country ownership;
- initial value/defaultValue and selectedCountry/defaultCountry conflicts;
- empty initialization without a callback;
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

Exact packed Next.js and Vite consumers verify both an initial controlled
`external-value` event and the later `user` event through the published
component surface under latest and minimum React 19 / MUI 9 peer matrices. The
generated declaration is checked for the full reason union and nullable
callback signature.

The current source matrix contains 93 unit tests and 101 Browser Mode tests in
each of Chromium, Firefox, and WebKit. Package, SSR/hydration, callback, and
consumer gates use the exact generated tarball.

Current package measurements remain within budget:

- main closure: 20,172 bytes gzip against 25,600;
- neutral server entry: 4,794 bytes gzip against 10,240;
- packed tarball: 84,617 bytes.

No npm publication occurred.
