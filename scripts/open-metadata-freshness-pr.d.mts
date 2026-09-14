export const AUTOMATION_AUTHOR_EMAIL: string;
export const METADATA_REVIEW_FILES: readonly string[];

export interface MetadataReviewPullRequest {
  number: number;
  state: string;
  url: string;
}

export type ExistingMetadataReviewDisposition =
  | { action: 'reuse-open'; pullRequest: MetadataReviewPullRequest }
  | { action: 'respect-finished'; pullRequest: MetadataReviewPullRequest }
  | { action: 'create' };

export interface AutomationOwnedBranchEvidence {
  authors: string[];
  changedPaths: string[];
}

export interface MetadataFreshnessPullRequestResult {
  action: 'reuse-open' | 'respect-finished' | 'create' | 'replace-orphan-and-create';
  branch: string;
  url: string;
}

export function metadataFreshnessBranch(version: string): string;
export function existingReviewDisposition(
  pullRequests: MetadataReviewPullRequest[],
): ExistingMetadataReviewDisposition;
export function validateAutomationOwnedBranch(
  evidence: AutomationOwnedBranchEvidence,
): void;
export function openMetadataFreshnessPullRequest(options: {
  latest: string;
}): MetadataFreshnessPullRequestResult;
