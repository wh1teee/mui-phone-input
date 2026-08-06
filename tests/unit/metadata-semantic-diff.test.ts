import { describe, expect, it } from 'vitest';

import {
  diffMetadataSemanticSnapshots,
  renderMetadataSemanticDiff,
} from '../../scripts/lib/metadata-semantic-diff.mjs';

describe('metadata semantic diff', () => {
  it('reports every product-semantic field required for human review', () => {
    const before = {
      presets: {
        max: {
          examples: { BY: '+375291234567' },
          numbers: {
            sample: {
              numberType: 'MOBILE',
              possibility: true,
              possibleCountries: ['BY'],
              resolvedCountry: 'BY',
              strictValidity: true,
            },
          },
        },
      },
      version: '1.0.0',
    };
    const after = {
      presets: {
        max: {
          examples: { BY: '+375331234567' },
          numbers: {
            sample: {
              numberType: 'FIXED_LINE_OR_MOBILE',
              possibility: false,
              possibleCountries: ['BY', 'RU'],
              resolvedCountry: null,
              strictValidity: false,
            },
          },
        },
      },
      version: '1.0.1',
    };

    const changes = diffMetadataSemanticSnapshots(before, after);
    expect(changes.map((change) => change.field).sort()).toEqual([
      'examples',
      'numberType',
      'possibility',
      'possibleCountries',
      'resolvedCountry',
      'strictValidity',
    ]);

    const markdown = renderMetadataSemanticDiff(before, after, changes);
    expect(markdown).toContain('Possibility');
    expect(markdown).toContain('Strict validity');
    expect(markdown).toContain('Resolved country');
    expect(markdown).toContain('Possible countries');
    expect(markdown).toContain('Number type');
    expect(markdown).toContain('Examples');
    expect(markdown).toContain('Human review required');
    expect(markdown).toContain('Changeset required');
    expect(markdown).toContain('Never auto-merge');
  });
});
