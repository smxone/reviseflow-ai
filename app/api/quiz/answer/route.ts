// POST /api/quiz/answer - grade the student's answer, ingest the outcome so the node's state
// updates live on the map (correct → fresh non-correction activity → toward Mastered;
import { NextRequest, NextResponse } from "next/server";
import { addStudyMemory, containerTagFor, type StudyMemoryMetadata } from "@/lib/supermemory";
import { getNode } from "@/lib/roadmap-data";
import { generate } from "@/lib/llm";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { nodeId, question, answer } = body ?? {};

  if (
    typeof nodeId !== "string" ||
    typeof question !== "string" ||
    typeof answer !== "string" ||
    !answer.trim()
  ) {
    return NextResponse.json({ error: "nodeId, question, and answer are required" }, { status: 400 });
  }

  const node = getNode(nodeId);
  if (!node) {
    return NextResponse.json({ error: `Unknown nodeId: ${nodeId}` }, { status: 400 });
  }

  const gradePrompt = `Quiz question about "${node.title}": ${question}

Student's answer:
"""
${answer}
"""

Grade it. Be fair: accept informal wording if the core idea is right.
Respond with ONLY a JSON object, no prose, no fences:
{"correct": boolean, "feedback": "one or two sentences - if wrong, state the right idea briefly"}`;

  let correct: boolean;
  let feedback: string;
  try {
    const raw = await generate(gradePrompt);
    const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
    if (typeof parsed.correct !== "boolean" || typeof parsed.feedback !== "string") {
      throw new Error("bad grade shape");
    }
    correct = parsed.correct;
    feedback = parsed.feedback;
  } catch (e) {
    console.error("/api/quiz/answer grading failed:", e);
    return NextResponse.json({ error: "Could not grade the answer" }, { status: 502 });
  }

  const metadata: StudyMemoryMetadata = {
    subjectId: node.subjectId,
    nodeId: node.id,
    isTangent: false,
    wasCorrection: !correct, // a wrong answer records a live misconception → node turns Shaky
    source: "chat",
    turnRole: "user",
    createdAtClient: new Date().toISOString(),
  };

  try {
    await addStudyMemory({
      content: `Quiz on ${node.title} - Q: ${question} - My answer: ${answer} - Verdict: ${
        correct ? "correct" : "incorrect"
      }. ${feedback}`,
      containerTag: containerTagFor(node.subjectId),
      metadata,
    });
  } catch (e) {
    console.error("/api/quiz/answer ingestion failed:", e);
    return NextResponse.json({ error: "Failed to save quiz outcome" }, { status: 502 });
  }

  // Optimistic hint - the delayed /api/node/[id] refetch settles the real state (async indexing).
  return NextResponse.json({ correct, feedback, stateHint: correct ? "Mastered" : "Shaky" });
}
