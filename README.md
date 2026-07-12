# ReviseFlow

**Never lose your learning flow.** Turn scattered AI conversations into a continuous learning journey.

ReviseFlow is a local-first learning-memory companion built entirely on **[Supermemory Local](https://supermemory.ai)**. You study by chatting; ReviseFlow extracts what you learn into a visual knowledge graph with per-topic mastery, connects ideas across subjects, quizzes you on exactly what you're forgetting, and compiles a revision sheet - all running on your own machine.

> AI remembers the conversation. **ReviseFlow remembers your learning journey.**

---

## How it uses Supermemory Local

Supermemory Local (at `localhost:6767`) is the **entire memory brain** - we wrote no extraction, embedding, ranking, contradiction, or forgetting logic ourselves. Each demo beat puts a distinct Supermemory capability on screen:

| Beat | What you see | Supermemory capability | The call |
|---|---|---|---|
| **Knowledge map** | Topics as nodes, colored by live per-topic state | Fact extraction + **profiles** (static/dynamic) | `profile({ containerTag, filters })` |
| **Study chat** | Explain or ask; the node updates | **Ingestion** → automatic fact extraction | `add({ content, containerTag, metadata })` |
| **Connect** | "This links to what you already know" - an edge animates across subjects | **Relationships** / knowledge graph | `search.memories({ q, containerTag })` |
| **Quiz what's fading** | It picks the *fading* topics specifically and shows why | **Forgetting** + profiles | `profile` + `search.documents({ filters })` |
| **Revision sheet** | Prioritized notes, corrections flagged | **Hybrid search + metadata filters** + **temporality** | `search.documents({ containerTags, filters })` |
| **Runs fully local** | Everything above, on your machine | **Supermemory Local** single binary | `baseURL: http://localhost:6767` |

Six Supermemory capabilities visible at once - **ingestion, fact extraction, profiles, relationships, temporality, forgetting** - with no memory logic of our own.

**Deliberately NOT reimplemented:** extraction, chunking, embedding, contradiction diffing, decay scoring, graph construction. That restraint is the point.

---

## Architecture

Single Next.js app (App Router, TypeScript). API routes are the backend; Supermemory Local is the only data store.

```
Browser  GraphCanvas · StudyPanel · QuizPanel · RevisionSheet · Connect
   │        (fetch → same-origin /api routes)
API      /api/chat  /api/node/[id]  /api/connect  /api/quiz  /api/quiz/answer  /api/revision
   │
lib      supermemory.ts · llm.ts · classify.ts · node-state.ts · node-status.ts · roadmap-data.ts
   │
         Supermemory Local :6767   +   LLM (Gemini / Ollama, behind lib/llm.ts)
```

- **One `containerTag` per subject** (`user1_gate_os`, `user1_dsa`); node identity lives in `metadata.nodeId`. One connected graph per subject is what makes the Connect beat work.
- **Node state** (`Unstarted / Learning / Shaky / Mastered / Fading`) is derived in `lib/node-state.ts` from Supermemory's `profile()` facts plus our own `createdAtClient` staleness.

---

## Run it locally

Prerequisites: **Supermemory Local** running on `:6767`, and an LLM (Gemini key, or Ollama for fully offline).

```bash
cp .env.local.example .env.local   # fill in SUPERMEMORY_API_KEY, GEMINI_API_KEY, etc.
npm install
npm run dev                        # http://localhost:3000
```

Seed a demo-ready 3-week study history (and reset between runs):

```bash
bun run scripts/reset.ts           # clear the demo container tags
bun run scripts/seed.ts            # seed a realistic journey (self-confirming)
```

> The seed is idempotent and confirms each topic's facts actually landed. For a targeted top-up of specific nodes: `bun run scripts/seed.ts <nodeId> <nodeId>`.

---

## Notes

- **Offline:** the ReviseFlow app + its LLM run fully offline with Ollama; Supermemory itself is local. Set `LLM_PROVIDER=ollama` and point Supermemory's provider at Ollama too.


## License

MIT - see [LICENSE](LICENSE).
