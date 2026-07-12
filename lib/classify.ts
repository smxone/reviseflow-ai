// Classifies a study-chat turn into { isTangent, parentNodeId, wasCorrection, concepts[], confidence }.
// this only decides whether the turn is a tangent, a correction, and what concepts it touches.
// Strict JSON from the LLM, parsed defensively (no prose/fences trusted) - low confidence never
// drops the memory, the caller (/api/chat) reassigns it to a safer node instead.
import { generate } from "./llm";

export interface ClassificationResult {
  isTangent: boolean;
  parentNodeId: string | null;
  wasCorrection: boolean;
  concepts: string[];
  confidence: number;
}

// Below this, /api/chat reassigns the memory away from the (possibly wrong) active node.
export const LOW_CONFIDENCE_THRESHOLD = 0.5;

const FALLBACK: ClassificationResult = {
  isTangent: false,
  parentNodeId: null,
  wasCorrection: false,
  concepts: [],
  confidence: 0,
};

function buildPrompt(activeNodeTitle: string, priorContext: string, message: string): string {
  return `You are classifying one turn of a student's study chat for the topic "${activeNodeTitle}".

Prior context (may be empty):
${priorContext || "(none)"}

Student's message:
"""
${message}
"""

Respond with ONLY a single JSON object, no prose, no markdown code fences, matching exactly this shape:
{"isTangent": boolean, "parentNodeId": string | null, "wasCorrection": boolean, "concepts": string[], "confidence": number}

- isTangent: true if this message goes off on a detour/sub-topic rather than directly continuing "${activeNodeTitle}".
- parentNodeId: null unless isTangent is true, in which case use "${activeNodeTitle}" as the parent reference.
- wasCorrection: true if the student is correcting or retracting something they previously believed.
- concepts: short lowercase key concept phrases mentioned (2-5 items), used to find cross-topic links later.
- confidence: your confidence in this classification, 0 to 1.`;
}

function parseDefensively(raw: string): ClassificationResult | null {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    if (
      typeof parsed.isTangent !== "boolean" ||
      typeof parsed.wasCorrection !== "boolean" ||
      !Array.isArray(parsed.concepts) ||
      typeof parsed.confidence !== "number"
    ) {
      return null;
    }
    return {
      isTangent: parsed.isTangent,
      parentNodeId: typeof parsed.parentNodeId === "string" ? parsed.parentNodeId : null,
      wasCorrection: parsed.wasCorrection,
      concepts: parsed.concepts.filter((c: unknown) => typeof c === "string"),
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
    };
  } catch {
    return null;
  }
}

export async function classify(
  message: string,
  activeNodeTitle: string,
  priorContext = "",
): Promise<ClassificationResult> {
  try {
    const raw = await generate(buildPrompt(activeNodeTitle, priorContext, message));
    return parseDefensively(raw) ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}
