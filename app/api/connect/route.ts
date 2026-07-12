// POST /api/connect - surface a genuine, non-obvious cross-topic link for the active node.
// relationship signal (threshold ≈ 0.7); candidates must be a different node and not a direct
// prerequisite in either direction (a prereq link is obvious, not delightful).
// containerTag is per subject, so we search every subject's tag and merge - this is what lets a
// GATE OS topic connect to a DSA topic.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor } from "@/lib/supermemory";
import { getNode, ROADMAP_NODES } from "@/lib/roadmap-data";
import { generate } from "@/lib/llm";

const CONNECT_THRESHOLD = 0.7; // from Spike C - recalibrate against seeded data if needed

interface MemoryHit {
  memory: string;
  similarity: number;
  nodeId: string;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { nodeId } = body ?? {};

  const node = typeof nodeId === "string" ? getNode(nodeId) : undefined;
  if (!node) {
    return NextResponse.json({ error: `Unknown nodeId: ${nodeId}` }, { status: 400 });
  }

  try {
    // The active node's concepts[] (collected at capture time) are the search hooks.
    const ownDocs = await sm.search.documents({
      containerTags: [containerTagFor(node.subjectId)],
      q: node.title,
      filters: { AND: [{ key: "nodeId", value: node.id, filterType: "metadata" }] },
      limit: 30,
    });
    const concepts = new Set<string>();
    for (const doc of ownDocs.results ?? []) {
      const meta = doc.metadata as Record<string, unknown> | null;
      if (Array.isArray(meta?.concepts)) {
        for (const c of meta.concepts) if (typeof c === "string") concepts.add(c);
      }
    }
    const q =
      concepts.size > 0
        ? [...concepts].slice(0, 8).join(", ")
        : `${node.title} - ${node.description}`;

    const subjectIds = [...new Set(ROADMAP_NODES.map((n) => n.subjectId))];
    const searches = await Promise.all(
      subjectIds.map((s) => sm.search.memories({ q, containerTag: containerTagFor(s), limit: 20 })),
    );

    const candidates: MemoryHit[] = [];
    for (const result of searches) {
      for (const hit of result.results ?? []) {
        const h = hit as { memory?: string; similarity?: number; metadata?: Record<string, unknown> };
        const targetId = typeof h.metadata?.nodeId === "string" ? h.metadata.nodeId : null;
        if (!targetId || targetId === node.id) continue;
        if (targetId.includes("__tangent")) continue;
        const target = getNode(targetId);
        if (!target) continue;
        // Direct prerequisites (either direction) are obvious links - skip them.
        if (node.prerequisiteIds.includes(targetId) || target.prerequisiteIds.includes(node.id)) continue;
        if (typeof h.similarity !== "number" || h.similarity < CONNECT_THRESHOLD) continue;
        candidates.push({ memory: h.memory ?? "", similarity: h.similarity, nodeId: targetId });
      }
    }

    if (candidates.length === 0) {
      // Guardrail: no strong link → say nothing rather than fabricate.
      return NextResponse.json({ connection: null });
    }

    candidates.sort((a, b) => b.similarity - a.similarity);
    const best = candidates[0];
    const target = getNode(best.nodeId)!;

    let explanation = "";
    try {
      explanation = (
        await generate(
          `A student studied "${node.title}" (${node.description}) and, separately, "${target.title}" (${target.description}).
From their notes on ${target.title}: "${best.memory}"

In ONE sentence, addressed to the student ("you"), explain the non-obvious conceptual link between these two topics. No preamble.`,
        )
      ).trim();
    } catch {
      explanation = `${node.title} and ${target.title} share the same underlying idea.`;
    }

    return NextResponse.json({
      connection: {
        sourceNodeId: node.id,
        targetNodeId: target.id,
        targetTitle: target.title,
        targetSubjectId: target.subjectId,
        similarity: best.similarity,
        memory: best.memory,
        explanation,
      },
    });
  } catch (e) {
    console.error("/api/connect failed:", e);
    return NextResponse.json({ error: "Failed to find connections" }, { status: 502 });
  }
}
