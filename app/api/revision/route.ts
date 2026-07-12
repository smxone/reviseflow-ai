// POST /api/revision - compile the whole subject(s) into a prioritized revision sheet:
// fading-first ranking, per-node synthesized notes (profile filtered by nodeId - the engine's own
// extracted facts read far better as revision notes than raw chat), corrections pulled from
import { NextResponse } from "next/server";
import { ROADMAP_NODES } from "@/lib/roadmap-data";
import { getNodeStatus } from "@/lib/node-status";
import type { NodeState } from "@/lib/node-state";

const STATE_PRIORITY: Record<NodeState, number> = {
  Fading: 0,
  Shaky: 1,
  Learning: 2,
  Mastered: 3,
  Unstarted: 4,
};

// The engine prefixes extracted facts with "[YYYY-MM-DD] " - strip for cleaner sheet copy.
function cleanFact(fact: string): string {
  return fact.replace(/^\[\d{4}-\d{2}-\d{2}\]\s*/, "");
}

export async function POST() {
  try {
    const statuses = await Promise.all(ROADMAP_NODES.map(getNodeStatus));

    const items = statuses
      .filter((s) => s.state !== "Unstarted")
      .sort(
        (a, b) =>
          STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state] ||
          (a.lastStudiedAt?.getTime() ?? 0) - (b.lastStudiedAt?.getTime() ?? 0),
      )
      .map((s) => ({
        nodeId: s.node.id,
        title: s.node.title,
        subjectId: s.node.subjectId,
        state: s.state,
        lastStudiedAt: s.lastStudiedAt?.toISOString() ?? null,
        notes: [...s.staticFacts, ...s.dynamic].map(cleanFact).slice(0, 6),
        corrections: s.docs
          .filter((d) => d.wasCorrection && d.turnRole === "user" && d.content)
          .map((d) => d.content.slice(0, 220)),
      }));

    return NextResponse.json({ items });
  } catch (e) {
    console.error("/api/revision failed:", e);
    return NextResponse.json({ error: "Failed to build revision sheet" }, { status: 502 });
  }
}
