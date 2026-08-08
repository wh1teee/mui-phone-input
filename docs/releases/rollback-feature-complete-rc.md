npm `latest` remains pinned to the bootstrap prerelease and is not advanced by
this feature-complete RC. Rollback therefore removes the affected RC from
`next` discovery while preserving the immutable npm package, provenance, and
GitHub release evidence.

1. Confirm the affected version and exact candidate SHA-256 from the GitHub prerelease.
2. Deprecate the affected RC with an actionable replacement message:

   ```bash
   npm deprecate @wh1teee/mui-phone-input@0.1.0-next.7 "RC withdrawn; use 0.1.0-next.6 until a replacement RC is published."
   ```

3. Restore the `next` dist-tag to the last verified prerelease without changing `latest`:

   ```bash
   npm dist-tag add @wh1teee/mui-phone-input@0.1.0-next.6 next
   ```

4. Mark the matching GitHub prerelease as withdrawn and link the replacement when one exists.
5. Do not rebuild, overwrite, or republish `0.1.0-next.7`. A correction must use a new immutable prerelease version and a new Git tag.

Unpublish is reserved for a confirmed credential, malware, or secret-exposure
incident and must follow the current npm unpublish policy; it is not the normal
rollback mechanism.
