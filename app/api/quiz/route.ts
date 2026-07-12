// POST /api/quiz - pick the topics most likely forgotten (Fading first, then Shaky, then stale
// Learning as filler), generate ONE question per topic grounded in what the student actually
// studied, and return the selection RATIONALE so the UI can show why each topic was picked.
import { NextResponse } from "next/server";
import { ROADMAP_NODES } from "@/lib/roadmap-data";
import { getNodeStatus, type NodeStatus } from "@/lib/node-status";
import { isStale, daysAgo } from "@/lib/node-state";
import { generate } from "@/lib/llm";

const MAX_QUESTIONS = 3;

function rationaleFor(s: NodeStatus): string {
  if (s.state === "Fading" && s.lastStudiedAt) {
    return `Fading - last studied ${daysAgo(s.lastStudiedAt)} days ago`;
  }
  if (s.state === "Shaky") {
    return "Shaky - your latest note here was a correction";
  }
  if (s.lastStudiedAt) {
    return `Reinforcement - studied ${daysAgo(s.lastStudiedAt)} days ago`;
  }
  return "Reinforcement";
}

async function questionFor(s: NodeStatus): Promise<string> {
  const studied = s.docs
    .map((d) => d.content)
    .filter(Boolean)
    .join("\n")
    .slice(0, 1600);

  const prompt = `A student studied "${s.node.title}". Below are their OWN study notes/conversations:
"""
${studied || s.dynamic.join("\n")}
"""

Write ONE short quiz question that tests whether they still remember what THEY studied above - not generic textbook trivia. If their notes contain a corrected misconception, probe that.

Respond with ONLY a JSON object, no prose, no fences: {"question": string}`;

  try {
    const raw = await generate(prompt);
    const parsed = JSON.parse(raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim());
    if (typeof parsed.question === "string" && parsed.question.length > 0) return parsed.question;
  } catch {
    // fall through to fallback
  }
  return `Explain the key idea of ${s.node.title} in your own words.`;
}

export async function POST() {
  try {
    const statuses = await Promise.all(ROADMAP_NODES.map(getNodeStatus));

    const fading = statuses
      .filter((s) => s.state === "Fading")
      .sort((a, b) => (a.lastStudiedAt?.getTime() ?? 0) - (b.lastStudiedAt?.getTime() ?? 0));
    const shaky = statuses.filter((s) => s.state === "Shaky");
    const staleLearning = statuses.filter(
      (s) => s.state === "Learning" && isStale(s.lastStudiedAt),
    );

    const selected = [...fading, ...shaky, ...staleLearning].slice(0, MAX_QUESTIONS);

    if (selected.length === 0) {
      return NextResponse.json({ questions: [] });
    }

    const questions = await Promise.all(
      selected.map(async (s) => ({
        nodeId: s.node.id,
        title: s.node.title,
        state: s.state,
        rationale: rationaleFor(s),
        question: await questionFor(s),
      })),
    );

    return NextResponse.json({ questions });
  } catch (e) {
    console.error("/api/quiz failed:", e);
    return NextResponse.json({ error: "Failed to build quiz" }, { status: 502 });
  }
}
