// POST /api/practice-transfer — connect a completed quiz to another useful practice topic.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor } from "@/lib/supermemory";
import { generate } from "@/lib/llm";
import { getNode, ROADMAP_NODES } from "@/lib/roadmap-data";
import {
  strongestPracticeTransfer,
  type PracticeTransferMatch,
} from "@/lib/practice-connections";

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => null);
  const completedNode =
    typeof payload?.completedNodeId === "string" ? getNode(payload.completedNodeId) : undefined;
  if (!completedNode) {
    return NextResponse.json({ error: "A valid completedNodeId is required" }, { status: 400 });
  }

  try {
    const subjects = [...new Set(ROADMAP_NODES.map((node) => node.subjectId))];
    const responses = await Promise.all(
      subjects.map((subjectId) =>
        sm.search.memories({
          containerTag: containerTagFor(subjectId),
          q: `Practice transfer from ${completedNode.title}: ${completedNode.description}`,
          limit: 8,
        }),
      ),
    );

    const matches: PracticeTransferMatch[] = responses.flatMap((response) =>
      (response.results ?? []).flatMap((result) => {
        const metadata = result.metadata as Record<string, unknown> | null;
        return typeof metadata?.nodeId === "string" && typeof result.similarity === "number"
          ? [{ targetNodeId: metadata.nodeId, evidence: result.memory ?? "", score: result.similarity }]
          : [];
      }),
    );

    const match = strongestPracticeTransfer(matches);
    if (!match) return NextResponse.json({ transfer: null });

    const targetNode = getNode(match.targetNodeId);
    if (!targetNode) return NextResponse.json({ transfer: null });

    const rationale = await generate(
      `The learner completed "${completedNode.title}". In one sentence, explain how practicing "${targetNode.title}" transfers the same reasoning. Use this evidence: "${match.evidence}".`,
    );

    return NextResponse.json({
      transfer: {
        fromNodeId: completedNode.id,
        toNodeId: targetNode.id,
        rationale: rationale.trim(),
        score: match.score,
      },
    });
  } catch (error) {
    console.error("/api/practice-transfer failed", error);
    return NextResponse.json({ error: "Failed to suggest practice transfer" }, { status: 502 });
  }
}
