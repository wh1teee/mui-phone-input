export interface NpmDistTags {
  [tag: string]: string;
}

export function assertEarlyCanaryDistTags(
  distTags: NpmDistTags,
  expectedVersion: string,
): void;
