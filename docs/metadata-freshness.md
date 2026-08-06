# Metadata presets and freshness

`libphonenumber-js` is the package's only telephone-numbering authority. The
default client and server APIs use max metadata while acceptance remains
`validationMode="possible"`. Strict validity and number type are available as
explicit policy signals; they are not promoted into the default acceptance
rule.

## Presets and custom metadata

The package publishes neutral metadata subpaths with the same `PhoneMetadata`
shape:

- `@wh1teee/mui-phone-input/metadata/max` — information-complete default;
- `@wh1teee/mui-phone-input/metadata/min` — smaller metadata with reduced
  strict-pattern/type information;
- `@wh1teee/mui-phone-input/metadata/mobile` — complete mobile patterns with
  intentionally reduced non-mobile type coverage;
- `@wh1teee/mui-phone-input/metadata/custom` — `validatePhoneMetadata()` for
  metadata generated from the official libphonenumber metadata generator.

Pass a preset through the public `metadata` option/prop when client and server
must use the same authority. Custom metadata is validated against the current
libphonenumber metadata-v4 contract and is then interpreted only through
`libphonenumber-js/core`; the package does not accept hand-written calling-code,
country, validity, or number-type override tables.

## Stale metadata behavior

Telephone numbering plans change independently of application releases. Stale
metadata can therefore report a newly issued real range as not strictly valid,
can change country resolution for shared calling codes, can omit a newly known
number type, or can expose an outdated example. This is why `possible` remains
the default acceptance policy even though max metadata is the default data set.

Applications that explicitly choose `validationMode="valid"` or
`possible-and-type` accept the corresponding false-rejection risk and should
track metadata freshness more aggressively. Possibility itself can also change
when national length rules change, so even possible-by-default applications
must review semantic diffs before updating metadata.

## Scheduled freshness review

`.github/workflows/metadata-freshness.yml` checks the current stable
`libphonenumber-js` release weekly. When a newer release exists it records a
golden-corpus snapshot before and after the dependency update and writes
`docs/metadata-freshness-latest.md` with explicit changes to:

- possibility;
- strict validity;
- resolved country;
- possible countries;
- number type;
- official mobile examples.

The workflow opens a pull request containing a patch changeset. It never
enables auto-merge and never merges the PR itself. Every semantic change
requires human review of the diff and the changeset before merge.

## Rollback procedure

If a metadata update produces unsafe behavior, do not amend numbering rules in
this package. Revert the metadata update commit or restore the previous exact
`libphonenumber-js` version in both the workspace and published package
manifests, regenerate `pnpm-lock.yaml`, then rebuild the before/after semantic
snapshot. Run unit tests, client/server parity, typecheck, lint, build, and
package verification on the rollback candidate before merging it.

If a problematic metadata release has already shipped, publish a patch release
that pins the previously reviewed `libphonenumber-js` version. Keep the semantic
diff and changeset in the rollback PR so reviewers can verify that the previous
behavior is restored. Upstream numbering corrections belong in
`libphonenumber-js` / Google's numbering data, not in a local country table.

