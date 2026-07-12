// Derives a roadmap node's 5-state status from profile() output + our own correction/staleness
//
//   observable window - the spec's "static, fresh → Mastered / static, stale → Fading" table
//   would make both states unreachable on real data. So "substance" (has this topic been studied
//   enough to be masterable?) is: any static fact OR >= SUBSTANCE_THRESHOLD dynamic facts.
// - Staleness comes from OUR `createdAtClient` metadata age (the engine's own timestamps always
//   reflect ingestion time and can't be backdated).
// - Shaky is driven by recency, not mere existence, of corrections: a node is Shaky when the
//   LATEST activity on it is a correction (or wrong quiz answer). Studying it again - or answering
//   a quiz question correctly - supersedes the correction and the node can reach Mastered. This
//   makes the quiz loop visibly self-healing on the map.
//
// Pure and unit-testable: no fetching here. lib/node-status.ts sources the inputs.

export type NodeState = "Unstarted" | "Learning" | "Shaky" | "Mastered" | "Fading";

// Tunables - recalibrated against seeded demo data (Phase 8).
export const FADING_THRESHOLD_DAYS = 7;
export const SUBSTANCE_THRESHOLD = 4; // dynamic facts needed to count as substantially studied

export interface DeriveNodeStateInput {
  static: string[];
  dynamic: string[];
  lastStudiedAt: Date | null; // max createdAtClient across ALL of the node's docs
  lastCorrectionAt: Date | null; // max createdAtClient across wasCorrection docs
  now?: Date;
}

export function deriveNodeState({
  static: staticFacts,
  dynamic,
  lastStudiedAt,
  lastCorrectionAt,
  now = new Date(),
}: DeriveNodeStateInput): NodeState {
  if (staticFacts.length === 0 && dynamic.length === 0) return "Unstarted";

  const hasSubstance = staticFacts.length > 0 || dynamic.length >= SUBSTANCE_THRESHOLD;
  const correctionIsLatest =
    lastCorrectionAt !== null && (lastStudiedAt === null || lastCorrectionAt >= lastStudiedAt);

  if (!hasSubstance) return correctionIsLatest ? "Shaky" : "Learning";
  if (isStale(lastStudiedAt, now)) return "Fading";
  return correctionIsLatest ? "Shaky" : "Mastered";
}

export function isStale(lastStudiedAt: Date | null, now: Date = new Date()): boolean {
  if (!lastStudiedAt) return true;
  const ageDays = (now.getTime() - lastStudiedAt.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > FADING_THRESHOLD_DAYS;
}

export function daysAgo(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.round((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)));
}
