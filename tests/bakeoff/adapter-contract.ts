import type { CorpusScenario } from '../corpus/types';

export type InputEngineSnapshot = Readonly<{
  canonicalValue: `+${string}` | undefined;
  displayValue: string;
  selectionStart: number;
  selectionEnd: number;
  callbackCount: number;
  selectedCountry?: string;
  detectedCountry?: string;
  resolvedCountry?: string;
  numberingPlan: 'geographic' | 'non-geographic' | 'unresolved';
}>;

export interface InputEngineDriver {
  execute(step: string): Promise<void>;
  snapshot(): Promise<InputEngineSnapshot>;
  destroy(): Promise<void>;
}

export interface InputEngineBakeoffAdapter {
  readonly id: 'maskito' | 'adapted-input-format';
  mount(scenario: CorpusScenario): Promise<InputEngineDriver>;
}
