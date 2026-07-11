// LLM provider interface: Gemini (in use) / Ollama (optional, unused unless LLM_PROVIDER=ollama).
// One entry point — chat/classify/connect/quiz-gen all call `generate()`; the provider is an
// implementation detail selected by LLM_PROVIDER. Ollama is not required to be running when
// LLM_PROVIDER=gemini. TODO: expand into structured chat/classify helpers per IMPLEMENTATION_SPEC.md §2/§3
// as those features get built (Phase 3+).

const GEMINI_MODEL = "gemini-flash-latest";

async function generateWithGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function generateWithOllama(prompt: string): Promise<string> {
  const baseURL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL;
  if (!model) throw new Error("OLLAMA_MODEL is not set");

  const res = await fetch(`${baseURL}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt, stream: false }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Ollama API error ${res.status}: ${body}`);
  }

  const data = await res.json();
  return data.response ?? "";
}

export async function generate(prompt: string): Promise<string> {
  const provider = process.env.LLM_PROVIDER ?? "ollama";
  if (provider === "gemini") return generateWithGemini(prompt);
  if (provider === "ollama") return generateWithOllama(prompt);
  throw new Error(`Unknown LLM_PROVIDER: ${provider}`);
}
