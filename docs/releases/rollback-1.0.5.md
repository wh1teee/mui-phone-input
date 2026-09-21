Stable releases are immutable. Do not rebuild, overwrite, unpublish, or replace
the `1.0.5` tarball.

1. Confirm the Git tag, candidate SHA-256, registry SHA-256, provenance audit and
   GitHub Release evidence.
2. Stop downstream rollout and pin the last verified exact version.
3. Mark the affected version without changing its bytes:

   ```sh
   npm deprecate @wh1teee/mui-phone-input@1.0.5 "Withdrawn; pin the last verified version while a corrective patch is prepared."
   ```

4. Restore the npm `latest` dist-tag only to a separately verified stable artifact.
5. Keep `next` on the reviewed historical prerelease line.
6. Publish a correction as a new SemVer patch with a new source commit, tag,
   exact candidate receipt, OIDC publication and registry byte-parity proof.

Do not rebuild 1.0.5.
