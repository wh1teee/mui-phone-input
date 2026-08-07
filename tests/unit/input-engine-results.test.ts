import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import {
  INPUT_TRANSACTION_ENGINE_CONTRACT_VERSION,
  SELECTED_INPUT_TRANSACTION_ENGINE,
} from '../../packages/mui-phone-input/src/internal/input-transaction-engine';
import {
  INPUT_ENGINE_RESULTS,
  type ScenarioCandidateResult,
  SELECTED_INPUT_ENGINE,
} from '../bakeoff/results/input-engine-results';
import { INPUT_TRANSACTION_CORPUS } from '../corpus/input-transactions';

describe('input-engine decision evidence', () => {
  it('records exactly one result for every required corpus scenario', () => {
    const corpusIds = INPUT_TRANSACTION_CORPUS.map(({ id }) => id).sort();
    const resultIds = INPUT_ENGINE_RESULTS.map(({ scenarioId }) => scenarioId).sort();

    expect(resultIds).toEqual(corpusIds);
    expect(new Set(resultIds).size).toBe(resultIds.length);
  });

  it('selects an engine with no known failed corpus scenario', () => {
    expect(SELECTED_INPUT_ENGINE).toBe('maskito');
    expect(SELECTED_INPUT_TRANSACTION_ENGINE).toBe(SELECTED_INPUT_ENGINE);
    expect(INPUT_TRANSACTION_ENGINE_CONTRACT_VERSION).toBe(1);
    expect(
      INPUT_ENGINE_RESULTS.filter(
        (result) => result[SELECTED_INPUT_ENGINE].status === 'fail',
      ),
    ).toEqual([]);
  });

  it('retains the adapted candidate smart-caret failure as decision evidence', () => {
    const middleInsert = INPUT_ENGINE_RESULTS.find(
      ({ scenarioId }) => scenarioId === 'input.insert.middle',
    );

    expect(middleInsert?.['adapted-input-format'].status).toBe('fail');
    expect(middleInsert?.['adapted-input-format'].observation).toMatch(
      /caret remains/u,
    );
  });

  it('does not mislabel emulation as physical mobile evidence', () => {
    for (const scenarioId of ['input.android.predictive', 'input.ime.composition']) {
      const result = INPUT_ENGINE_RESULTS.find(
        (candidateResult) => candidateResult.scenarioId === scenarioId,
      );
      const maskito = result?.maskito as ScenarioCandidateResult | undefined;
      const adapted = result?.['adapted-input-format'] as
        | ScenarioCandidateResult
        | undefined;

      expect(maskito?.status).toBe('emulated-pass');
      expect(maskito?.realDeviceStatus).toBe('deferred-to-mpi-oan.24');
      expect(adapted?.realDeviceStatus).toBe('deferred-to-mpi-oan.24');
    }
  });

  it('keeps manual DOM value/selection mutation out of the selected wrapper', async () => {
    const selectedSource = await readFile(
      'tests/bakeoff/candidates/MaskitoCandidate.tsx',
      'utf8',
    );
    const adaptedSource = await readFile(
      'tests/bakeoff/candidates/AdaptedInputFormatCandidate.tsx',
      'utf8',
    );

    expect(selectedSource).not.toMatch(/\.value\s*=/u);
    expect(selectedSource).not.toMatch(/setSelectionRange\(/u);
    expect(adaptedSource).toMatch(/\.value\s*=/u);
    expect(adaptedSource).toMatch(/setSelectionRange\(/u);
  });

  it('keeps event handlers free of direct DOM value repair assignments', async () => {
    const transactionSource = await readFile(
      'packages/mui-phone-input/src/internal/use-phone-input-transactions.ts',
      'utf8',
    );

    expect(transactionSource).not.toMatch(/event\.currentTarget\.value\s*=/u);
  });
});
