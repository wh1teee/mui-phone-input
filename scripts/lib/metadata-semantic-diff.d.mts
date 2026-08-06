export type MetadataSemanticField =
  | 'examples'
  | 'numberType'
  | 'possibility'
  | 'possibleCountries'
  | 'resolvedCountry'
  | 'strictValidity';

export interface MetadataSemanticChange {
  after: unknown;
  before: unknown;
  field: MetadataSemanticField;
  id: string;
  preset: string;
}

export interface MetadataSemanticSnapshot {
  presets?: Record<string, unknown>;
  version?: string;
}

export function diffMetadataSemanticSnapshots(
  before: MetadataSemanticSnapshot,
  after: MetadataSemanticSnapshot,
): MetadataSemanticChange[];

export function renderMetadataSemanticDiff(
  before: MetadataSemanticSnapshot,
  after: MetadataSemanticSnapshot,
  changes: readonly MetadataSemanticChange[],
): string;
