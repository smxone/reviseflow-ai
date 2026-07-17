// POST /api/revision-bridge — suggest a connection after completing a revision sheet.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor } from "@/lib/supermemory";
import { generate } from "@/lib/llm";
import { getNode, ROADMAP_NODES } from "@/lib/roadmap-data";
import {
  selectRevisionBridgeCandidate,
  type RevisionBridgeCandidate,
} from "@/lib/connection-candidates";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const node = typeof body?.nodeId === "string" ? getNode(body.nodeId) : undefined;
  if (!node) {
    return NextResponse.json({ error: "A valid nodeId is required" }, { status: 400 });
  }

  try {
    const subjectIds = [...new Set(ROADMAP_NODES.map((item) => item.subjectId))];
    const searches = await Promise.all(
      subjectIds.map((subjectId) =>
        sm.search.memories({
          containerTag: containerTagFor(subjectId),
          q: `${node.title}: ${node.description}`,
          limit: 10,
        }),
      ),
    );

    const candidates: RevisionBridgeCandidate[] = [];
    for (const search of searches) {
      for (const result of search.results ?? []) {
        const metadata = result.metadata as Record<string, unknown> | null;
        if (typeof metadata?.nodeId !== "string" || typeof result.similarity !== "number") continue;
        candidates.push({
          nodeId: metadata.nodeId,
          memory: result.memory ?? "",
          similarity: result.similarity,
        });
      }
    }

    const candidate = selectRevisionBridgeCandidate(candidates);
    if (!candidate) return NextResponse.json({ connection: null });

    const target = getNode(candidate.nodeId);
    if (!target) return NextResponse.json({ connection: null });

    const explanation = await generate(
      `Explain one useful connection between "${node.title}" and "${target.title}" using this study memory: "${candidate.memory}". Address the learner directly in one sentence.`,
    );

    return NextResponse.json({
      connection: {
        sourceNodeId: node.id,
        targetNodeId: target.id,
        explanation: explanation.trim(),
        similarity: candidate.similarity,
      },
    });
  } catch (error) {
    console.error("/api/revision-bridge failed", error);
    return NextResponse.json({ error: "Failed to build revision bridge" }, { status: 502 });
  }
}
