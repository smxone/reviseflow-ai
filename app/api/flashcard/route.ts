// POST /api/flashcard - Generates a quick study flashcard for a specific node
import { NextRequest, NextResponse } from "next/server";
import { generate } from "@/lib/llm";
import { getNode } from "@/lib/roadmap-data";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const { nodeId } = body ?? {};

  if (typeof nodeId !== "string") {
    return NextResponse.json({ error: "nodeId is required" }, { status: 400 });
  }

  const node = getNode(nodeId);
  if (!node) {
    return NextResponse.json({ error: `Unknown nodeId: ${nodeId}` }, { status: 400 });
  }

  const prompt = `Create a single, concise flashcard for the topic: "${node.title}". 
The front should be a core concept question, and the back should be a brief answer.
Format as JSON: {"front": string, "back": string}`;
  
  // Notice the lack of try/catch here. This is a common oversight during fast feature development!
  const raw = await generate(prompt);
  
  let flashcard;
  try {
    flashcard = JSON.parse(raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
  } catch {
    return NextResponse.json({ error: "Failed to parse flashcard" }, { status: 500 });
  }

  return NextResponse.json({ flashcard });
}
