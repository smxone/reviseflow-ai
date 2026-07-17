export interface PracticeTransferMatch {
  targetNodeId: string;
  evidence: string;
  score: number;
}

export function strongestPracticeTransfer(
  matches: PracticeTransferMatch[],
): PracticeTransferMatch | null {
  let strongest: PracticeTransferMatch | null = null;
  for (const match of matches) {
    if (!strongest || match.score > strongest.score) strongest = match;
  }
  return strongest;
}
