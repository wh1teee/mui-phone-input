export type CorpusBrowser = 'chromium' | 'firefox' | 'webkit';

export type CorpusArea =
  | 'input-transaction'
  | 'numbering-plan'
  | 'country-selector'
  | 'christofle';

export type CorpusScenario = Readonly<{
  id: string;
  title: string;
  area: CorpusArea;
  tags: readonly string[];
  browsers: readonly CorpusBrowser[];
  realDeviceGate?: 'android-chrome' | 'ios-safari';
  provenance: readonly string[];
  steps: readonly string[];
  assertions: readonly string[];
}>;

export const DESKTOP_BROWSER_MATRIX = [
  'chromium',
  'firefox',
  'webkit',
] as const satisfies readonly CorpusBrowser[];
