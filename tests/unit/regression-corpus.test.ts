import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { CHRISTOFLE_CORPUS } from '../corpus/christofle';
import { COUNTRY_SELECTOR_CORPUS } from '../corpus/country-selector';
import { INPUT_TRANSACTION_CORPUS } from '../corpus/input-transactions';
import {
  INPUT_TRANSACTION_COMMAND_KINDS,
  INPUT_TRANSACTION_INVARIANTS,
  type InputTransactionCommand,
} from '../model/input-transaction-model';

const corpus = [
  ...INPUT_TRANSACTION_CORPUS,
  ...COUNTRY_SELECTOR_CORPUS,
  ...CHRISTOFLE_CORPUS,
];

describe('shared regression corpus', () => {
  it('has unique IDs and complete browser/provenance/assertion contracts', () => {
    const ids = corpus.map(({ id }) => id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const scenario of corpus) {
      expect(scenario.browsers.length).toBeGreaterThan(0);
      expect(scenario.provenance.length).toBeGreaterThan(0);
      expect(scenario.steps.length).toBeGreaterThan(0);
      expect(scenario.assertions.length).toBeGreaterThan(0);
    }
  });

  it('covers every required 1.0 interaction family', () => {
    const tags = new Set(corpus.flatMap(({ tags }) => tags));

    for (const requiredTag of [
      'insert',
      'delete',
      'range-replacement',
      'paste',
      'autofill',
      'ime',
      'predictive-input',
      'unicode-digits',
      'controlled',
      'locale-change',
      'mask-change',
      'country-change',
      'fixed-calling-code',
      'undo',
      'redo',
      'react-strict-mode',
      'mui',
      'ssr',
      'ref-forwarding',
      'reset',
      'shared-calling-code',
      'non-geographic',
      'combobox',
      'dialog',
      'voiceover',
      'migration',
    ]) {
      expect(tags).toContain(requiredTag);
    }
  });

  it('links every model invariant to existing scenarios', () => {
    const ids = new Set(corpus.map(({ id }) => id));

    for (const invariant of INPUT_TRANSACTION_INVARIANTS) {
      expect(invariant.scenarios.length).toBeGreaterThan(0);
      expect(invariant.scenarios.every((id) => ids.has(id))).toBe(true);
    }
  });

  it('defines model commands as a closed generated vocabulary', () => {
    const kindArbitrary = fc.constantFrom(...INPUT_TRANSACTION_COMMAND_KINDS);

    fc.assert(
      fc.property(fc.array(kindArbitrary, { maxLength: 100 }), (kinds) => {
        const allowed = new Set<InputTransactionCommand['kind']>(
          INPUT_TRANSACTION_COMMAND_KINDS,
        );
        return kinds.every((kind) => allowed.has(kind));
      }),
    );
  });
});
