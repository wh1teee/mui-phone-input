npm requires every package to expose a `latest` dist-tag. During the early
canary program it remains pinned to the bootstrap `0.1.0-next.0` release and is
not advanced again. Rollback therefore means removing the affected version
from `next` discovery while preserving immutable registry and provenance
evidence.

1. Confirm the affected version and exact candidate SHA-256 from the GitHub release.
2. Deprecate the version with an actionable message:

   ```bash
   npm deprecate @wh1teee/mui-phone-input@<version> "Canary withdrawn; use <safe-version>."
   ```

3. Move the `next` dist-tag to the last verified safe canary, or remove it when
   no safe canary exists:

   ```bash
   npm dist-tag add @wh1teee/mui-phone-input@<safe-version> next
   # or
   npm dist-tag rm @wh1teee/mui-phone-input next
   ```

4. Mark the matching GitHub prerelease as withdrawn and link the replacement.
5. Do not rebuild or overwrite an existing version. A corrected candidate must
   use a new prerelease version and a new immutable tag.

Unpublish is reserved for a confirmed credential, malware or secret-exposure
incident and must follow the current npm unpublish policy; it is not the normal
rollback mechanism.
