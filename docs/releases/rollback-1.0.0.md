Stable releases are immutable. Do not rebuild, overwrite, unpublish, or replace
the `1.0.0` tarball.

1. Confirm the affected version, Git tag, candidate SHA-256, registry SHA-256,
   provenance audit and GitHub Release evidence.
2. Stop downstream rollout and pin the last verified exact version.
3. Mark the affected release without mutating its bytes:

   ```sh
   npm deprecate @wh1teee/mui-phone-input@1.0.0 "Withdrawn; pin the last verified version while 1.0.1 is prepared."
   ```

4. When a prior stable exists, restore the `latest` dist-tag explicitly. For the
   first stable release, do not point `latest` back to a prerelease; publish a
   corrected `1.0.1` and promote that exact artifact instead.
5. Keep `next` on the reviewed prerelease line for forensic reproduction unless
   a separately verified prerelease replaces it.
6. Mark the matching GitHub Release as withdrawn and link the corrective release.

Do not rebuild 1.0.0. A correction requires a new SemVer version, source commit,
tag, candidate receipt, OIDC publication and byte-parity verification.
