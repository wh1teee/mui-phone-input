export type InputEngineCandidate = 'maskito' | 'adapted-input-format';

export type ScenarioResultStatus =
  | 'pass'
  | 'fail'
  | 'emulated-pass'
  | 'shared-policy-pass';

export type ScenarioCandidateResult = Readonly<{
  status: ScenarioResultStatus;
  evidence: string;
  observation: string;
  realDeviceStatus?: 'deferred-to-mpi-oan.24';
}>;

export type InputEngineScenarioResult = Readonly<{
  scenarioId: string;
  maskito: ScenarioCandidateResult;
  'adapted-input-format': ScenarioCandidateResult;
}>;

export const SELECTED_INPUT_ENGINE = 'maskito' as const;
export const INPUT_ENGINE_CONTRACT_VERSION = 1 as const;

const pass = (
  evidence: string,
  observation = 'Passed in Chromium, Firefox, and WebKit.',
): ScenarioCandidateResult => ({ evidence, observation, status: 'pass' });

const emulatedPass = (
  evidence: string,
  observation: string,
): ScenarioCandidateResult => ({
  evidence,
  observation,
  realDeviceStatus: 'deferred-to-mpi-oan.24',
  status: 'emulated-pass',
});

const sharedPolicyPass = (
  evidence: string,
  observation: string,
): ScenarioCandidateResult => ({
  evidence,
  observation,
  status: 'shared-policy-pass',
});

const bothPass = (
  scenarioId: string,
  evidence: string,
  observation?: string,
): InputEngineScenarioResult => ({
  scenarioId,
  maskito: pass(evidence, observation),
  'adapted-input-format': pass(evidence, observation),
});

const bothEmulatedPass = (
  scenarioId: string,
  evidence: string,
  observation: string,
): InputEngineScenarioResult => ({
  scenarioId,
  maskito: emulatedPass(evidence, observation),
  'adapted-input-format': emulatedPass(evidence, observation),
});

const bothSharedPolicyPass = (
  scenarioId: string,
  evidence: string,
  observation: string,
): InputEngineScenarioResult => ({
  scenarioId,
  maskito: sharedPolicyPass(evidence, observation),
  'adapted-input-format': sharedPolicyPass(evidence, observation),
});

export const INPUT_ENGINE_RESULTS = [
  bothPass(
    'input.insert.start',
    'input-engine-bakeoff.browser.test.tsx: inserts at the start and end of a partial candidate',
  ),
  {
    scenarioId: 'input.insert.middle',
    maskito: pass(
      'input-engine-bakeoff.browser.test.tsx: preserves semantic selection for middle insert and range replacement',
      'Canonical value and semantic caret advance passed in Chromium, Firefox, and WebKit.',
    ),
    'adapted-input-format': {
      evidence:
        'input-engine-bakeoff.browser.test.tsx: preserves semantic selection for middle insert and range replacement',
      observation:
        'Canonical value updates, but the caret remains at the pre-insert position in Chromium, Firefox, and WebKit.',
      status: 'fail',
    },
  },
  bothPass(
    'input.insert.end',
    'input-engine-bakeoff.browser.test.tsx: inserts at the start and end of a partial candidate',
  ),
  bothPass(
    'input.clear.complete',
    'input-engine-extended.browser.test.tsx: clears the complete value to undefined with one callback',
  ),
  bothPass(
    'input.delete.backspace-separator',
    'input-engine-extended.browser.test.tsx: deletes semantic digits next to separators',
  ),
  bothPass(
    'input.delete.forward-separator',
    'input-engine-extended.browser.test.tsx: deletes semantic digits next to separators',
  ),
  bothPass(
    'input.range.replace',
    'input-engine-bakeoff.browser.test.tsx: preserves semantic selection for middle insert and range replacement',
    'A single insertReplacementText transaction replaces the selected semantic range in all three browsers.',
  ),
  bothPass(
    'input.paste.international',
    'input-engine-extended.browser.test.tsx: handles formatted international paste',
  ),
  bothPass(
    'input.paste.national',
    'input-engine-extended.browser.test.tsx: handles national paste with selected-country context',
  ),
  bothPass(
    'input.paste.formatted',
    'input-engine-extended.browser.test.tsx: handles formatted international paste',
  ),
  bothPass(
    'input.paste.calling-code',
    'input-engine-extended.browser.test.tsx: applies fixed-calling-code policy to paste',
  ),
  bothPass(
    'input.autofill.full-replacement',
    'input-engine-bakeoff.browser.test.tsx: uses input as the authoritative autofill fallback',
  ),
  bothEmulatedPass(
    'input.android.predictive',
    'input-engine-extended.browser.test.tsx: accepts predictive replacement through authoritative input',
    'insertReplacementText fallback passed in desktop Chromium; physical Android Chrome remains gated by mpi-oan.24.',
  ),
  bothEmulatedPass(
    'input.ime.composition',
    'input-engine-bakeoff.browser.test.tsx: commits only after composition ends and normalizes Unicode digits',
    'Composition lifecycle passed in Chromium, Firefox, and WebKit; physical mobile IME remains gated by mpi-oan.24.',
  ),
  bothPass(
    'input.unicode-digits',
    'input-engine-bakeoff.browser.test.tsx: commits only after composition ends and normalizes Unicode digits',
  ),
  bothPass(
    'input.controlled.external-update',
    'input-engine-bakeoff.browser.test.tsx: external updates and reset do not create callback loops',
  ),
  bothPass(
    'input.controlled.idempotent',
    'input-engine-bakeoff.browser.test.tsx: external updates and reset do not create callback loops',
  ),
  bothPass(
    'input.context.locale-change',
    'input-engine-extended.browser.test.tsx: preserves canonical value across separator, locale, and country updates',
  ),
  bothPass(
    'input.context.mask-change',
    'input-engine-extended.browser.test.tsx: preserves canonical value across separator, locale, and country updates',
    'Display separator strategy changes while canonical value and callback count remain stable.',
  ),
  bothPass(
    'input.context.country-change',
    'input-engine-extended.browser.test.tsx: preserves canonical value across separator, locale, and country updates',
  ),
  bothPass(
    'input.fixed-calling-code',
    'input-engine-bakeoff.browser.test.tsx: supports a fixed calling code and native input ref; input-engine-extended.browser.test.tsx: applies fixed-calling-code policy to paste',
  ),
  bothPass(
    'input.undo-redo',
    'input-engine-extended.browser.test.tsx: records native undo and redo behavior',
  ),
  bothPass(
    'input.strict-mode',
    'input-engine-extended.browser.test.tsx: does not double-commit under React Strict Mode',
  ),
  bothPass(
    'input.mui-text-field',
    'All candidate browser tests mount through MUI 9 TextField htmlInput slots.',
  ),
  bothPass(
    'input.ssr-hydration',
    'input-engine-extended.browser.test.tsx: renders on the server and hydrates without recovery errors',
  ),
  bothPass(
    'input.ref-forwarding',
    'input-engine-bakeoff.browser.test.tsx: supports a fixed calling code and native input ref',
  ),
  bothPass(
    'input.rhf-reset',
    'input-engine-extended.browser.test.tsx: resets coherently through React Hook Form',
  ),
  bothPass(
    'input.callback.single',
    'input-engine-bakeoff.browser.test.tsx and input-engine-extended.browser.test.tsx callback-count assertions',
  ),
  bothSharedPolicyPass(
    'number.shared-code.plus1',
    'input-engine-numbering-policy.test.ts: shared calling-code policy',
    'The engine delegates country possibility to the shared libphonenumber-js authority; +1 has multiple countries.',
  ),
  bothSharedPolicyPass(
    'number.shared-code.plus7',
    'input-engine-numbering-policy.test.ts: shared calling-code policy',
    'The engine delegates country possibility to the shared libphonenumber-js authority; +7 has KZ and RU.',
  ),
  bothSharedPolicyPass(
    'number.shared-code.plus44',
    'input-engine-numbering-policy.test.ts: shared calling-code policy',
    'The engine delegates country possibility to the shared libphonenumber-js authority; +44 remains shared.',
  ),
  bothSharedPolicyPass(
    'number.non-geographic',
    'input-engine-numbering-policy.test.ts: non-geographic policy',
    'The shared authority reports country undefined and non-geographic true for +800.',
  ),
] as const satisfies readonly InputEngineScenarioResult[];
