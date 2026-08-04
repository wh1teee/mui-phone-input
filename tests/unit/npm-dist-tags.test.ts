import { describe, expect, it } from 'vitest';

import { assertEarlyCanaryDistTags } from '../../scripts/lib/npm-dist-tags.mjs';

describe('early canary npm dist-tags', () => {
  it('accepts the registry-required latest tag when it remains on bootstrap', () => {
    expect(() =>
      assertEarlyCanaryDistTags(
        {
          latest: '0.1.0-next.0',
          next: '0.1.0-next.2',
        },
        '0.1.0-next.2',
      ),
    ).not.toThrow();
  });

  it('rejects a missing registry-required latest tag', () => {
    expect(() =>
      assertEarlyCanaryDistTags({ next: '0.1.0-next.2' }, '0.1.0-next.2'),
    ).toThrow('latest dist-tag must remain on 0.1.0-next.0');
  });

  it('rejects promotion of a later canary to latest', () => {
    expect(() =>
      assertEarlyCanaryDistTags(
        {
          latest: '0.1.0-next.2',
          next: '0.1.0-next.2',
        },
        '0.1.0-next.2',
      ),
    ).toThrow('latest dist-tag must remain on 0.1.0-next.0');
  });

  it('rejects a stale next tag', () => {
    expect(() =>
      assertEarlyCanaryDistTags(
        {
          latest: '0.1.0-next.0',
          next: '0.1.0-next.1',
        },
        '0.1.0-next.2',
      ),
    ).toThrow('next dist-tag must point to 0.1.0-next.2');
  });
});
