// POST /api/chat - classify -> profile() context -> LLM reply -> sm.add() -> reply + state hint.
// (turnRole distinguishes them), so the assistant's explanations also become searchable memory.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor, type StudyMemoryMetadata } from "@/lib/supermemory";
import { classify, LOW_CONFIDENCE_THRESHOLD } from "@/lib/classify";
import { generate } from "@/lib/llm";
import { getNode } from "@/lib/roadmap-data";
import { deriveNodeState } from "@/lib/node-state";

// Sentinel bucket for low-confidence classifications - no roadmap node has this id.
// Judgment call (no RoadmapNode in this build has a non-null `parentId` to fall back to):
const UNCLASSIFIED_NODE_ID = "unclassified";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { nodeId, message } = body ?? {};

  if (typeof nodeId !== "string" || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "nodeId and message are required" }, { status: 400 });
  }

  const node = getNode(nodeId);
  if (!node) {
    return NextResponse.json({ error: `Unknown nodeId: ${nodeId}` }, { status: 400 });
  }

  const containerTag = containerTagFor(node.subjectId);

  let profileStatic: string[] = [];
  let profileDynamic: string[] = [];
  try {
    // `filters`, not `q`, scopes profile.static/dynamic to this node - see the note in
    const profile = await sm.profile({
      containerTag,
      filters: { AND: [{ key: "nodeId", value: nodeId, filterType: "metadata" }] },
    });
    profileStatic = profile.profile.static;
    profileDynamic = profile.profile.dynamic;
  } catch (e) {
    // Profile context is a nice-to-have for the reply, not a hard dependency - continue without it.
    console.error("profile() failed, continuing without memory context:", e);
  }

  const classification = await classify(message, node.title, profileDynamic.join("\n"));

  // Node assignment: low confidence -> unclassified bucket (never dropped, just not trusted onto
  // the active node); tangent -> a fresh dynamically-named tangent node linked back via parentNodeId.
  let effectiveNodeId = nodeId;
  let parentNodeId: string | undefined;
  if (classification.confidence < LOW_CONFIDENCE_THRESHOLD) {
    effectiveNodeId = UNCLASSIFIED_NODE_ID;
  } else if (classification.isTangent) {
    effectiveNodeId = `${nodeId}__tangent-${Date.now()}`;
    parentNodeId = nodeId;
  }

  const replyPrompt = `You are a study tutor helping a student learn "${node.title}" (${node.description}).

What the student already knows (may be empty):
${[...profileStatic, ...profileDynamic].join("\n") || "(nothing yet)"}

Student says:
"""
${message}
"""

Reply concisely (2-4 sentences), directly addressing what they said, as a knowledgeable tutor.`;

  let reply: string;
  try {
    reply = await generate(replyPrompt);
  } catch (e) {
    console.error("LLM reply generation failed:", e);
    return NextResponse.json({ error: "LLM provider unavailable" }, { status: 502 });
  }

  const createdAtClient = new Date().toISOString();
  const baseMetadata: Omit<StudyMemoryMetadata, "turnRole"> = {
    subjectId: node.subjectId,
    nodeId: effectiveNodeId,
    parentNodeId,
    isTangent: classification.isTangent,
    wasCorrection: classification.wasCorrection,
    concepts: classification.concepts,
    source: "chat",
    createdAtClient,
  };

  try {
    await sm.add({
      content: message,
      containerTag,
      metadata: { ...baseMetadata, turnRole: "user" },
    });
    await sm.add({
      content: reply,
      containerTag,
      metadata: { ...baseMetadata, turnRole: "assistant" },
    });
  } catch (e) {
    console.error("sm.add() failed:", e);
    return NextResponse.json({ error: "Failed to save study turn" }, { status: 502 });
  }

  // Optimistic hint only - async indexing means this message's effects aren't reflected in
  // comes from a delayed refetch of /api/node/[id] (Phase 4), not from this response.
  const now = new Date();
  const stateHint = deriveNodeState({
    static: profileStatic,
    dynamic: [...profileDynamic, message],
    lastStudiedAt: now,
    lastCorrectionAt: classification.wasCorrection ? now : null,
  });

  return NextResponse.json({ reply, nodeId: effectiveNodeId, stateHint });
}
