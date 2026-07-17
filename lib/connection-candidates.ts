export interface RevisionBridgeCandidate {
  nodeId: string;
  memory: string;
  similarity: number;
}

// Revision bridges start with the strongest semantic result. Product-level eligibility
// rules are applied by the caller because each surface may define a different experience.
export function selectRevisionBridgeCandidate(
  candidates: RevisionBridgeCandidate[],
): RevisionBridgeCandidate | null {
  return [...candidates].sort((a, b) => b.similarity - a.similarity)[0] ?? null;
}
