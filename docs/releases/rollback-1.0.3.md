Stable releases are immutable. Do not rebuild, overwrite, unpublish, or replace
the `1.0.3` tarball.

1. Confirm the Git tag, candidate SHA-256, registry SHA-256, provenance audit and
   GitHub Release evidence.
2. Stop downstream rollout and pin the last verified exact version.
3. Mark the affected version without changing its bytes:

   ```sh
   npm deprecate @wh1teee/mui-phone-input@1.0.3 "Withdrawn; pin the last verified version while a corrective patch is prepared."
   ```

4. Restore `latest` only to a separately verified stable artifact. Do not point
   `latest` at an unpublished or failed tag.
5. Keep `next` on the reviewed `0.1.0-next.x` line for forensic reproduction.
6. Publish any correction as a new SemVer patch with a new source commit, tag,
   candidate receipt, OIDC publication and byte-parity proof.

Do not rebuild 1.0.3.
