// Supermemory Local client singleton (server-side only). See docs/INFRASTRUCTURE_SETUP.md §5.
//
// Deviation from CLAUDE.md's assumed namespacing: the installed SDK (supermemory@4.24.12) has
// NO `client.memories.add()`. Ingestion is the top-level `client.add()` (POST /v3/documents).
// `client.memories` only exposes `forget()` and `updateMemory()`. `client.profile()`,
// `client.search.documents()`, and `client.search.memories()` match the spec as written.
// Verified against node_modules/supermemory/src/client.ts and src/resources/*.ts — see
// docs/SPIKE_FINDINGS.md for the full note.
import Supermemory from "supermemory";

export const sm = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY!,
  baseURL: process.env.SUPERMEMORY_BASE_URL!,
  timeout: 20_000,
});
