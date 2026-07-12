//
// Deviation from CLAUDE.md's assumed namespacing: the installed SDK (supermemory@4.24.12) has
// NO `client.memories.add()`. Ingestion is the top-level `client.add()` (POST /v3/documents).
// `client.memories` only exposes `forget()` and `updateMemory()`. `client.profile()`,
// `client.search.documents()`, and `client.search.memories()` match the spec as written.
// Verified against node_modules/supermemory/src/client.ts and src/resources/*.ts - see
import Supermemory from "supermemory";

export const sm = new Supermemory({
  apiKey: process.env.SUPERMEMORY_API_KEY!,
  baseURL: process.env.SUPERMEMORY_BASE_URL!,
  timeout: 20_000,
});

// mode/source/sourceTool/practiceKind, which only exist to support E4 (Theory<->Practice via
export interface StudyMemoryMetadata {
  subjectId: string; // "gate_os" | "dsa"
  nodeId: string; // roadmap node id, e.g. "page-replacement"
  parentNodeId?: string; // for tangent nodes
  isTangent: boolean;
  wasCorrection: boolean; // drives the temporality/correction beat
  concepts?: string[]; // fuels the Connect beat's cross-topic search
  source: "chat";
  turnRole: "user" | "assistant";
  createdAtClient: string; // ISO string - ordering + Fading staleness (see SPIKE_FINDINGS.md Spike B)
}

// containerTag convention: ONE per subject, never per node. Node identity lives in metadata.nodeId.
export function containerTagFor(subjectId: string): string {
  return `user1_${subjectId}`;
}

// Single typed ingestion path. The SDK's `metadata` param is an index-signature type
// (`{ [k: string]: string | number | boolean | string[] }`); a value typed as the
// `StudyMemoryMetadata` interface is NOT structurally assignable to it (TS index-signature rule),
// so the cast lives here, once, and every caller keeps full StudyMemoryMetadata type-safety.
export function addStudyMemory(params: {
  content: string;
  containerTag: string;
  customId?: string;
  metadata: StudyMemoryMetadata;
}) {
  return sm.add({
    content: params.content,
    containerTag: params.containerTag,
    customId: params.customId,
    metadata: params.metadata as unknown as Record<string, string | number | boolean | string[]>,
  });
}
