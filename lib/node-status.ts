// Server-only helper: fetches a node's profile + documents from Supermemory and derives its
// state. Single source of truth for /api/node/[id], /api/quiz, and /api/revision - all three
// need the same (profile-filtered-by-nodeId + docs-filtered-by-nodeId) pair.
import { sm, containerTagFor } from "./supermemory";
import type { RoadmapNode } from "./roadmap-data";
import { deriveNodeState, type NodeState } from "./node-state";

export interface NodeDoc {
  content: string;
  wasCorrection: boolean;
  turnRole: string | null;
  createdAtClient: Date | null;
}

export interface NodeStatus {
  node: RoadmapNode;
  state: NodeState;
  staticFacts: string[];
  dynamic: string[];
  lastStudiedAt: Date | null;
  lastCorrectionAt: Date | null;
  docs: NodeDoc[];
}

export function nodeMemoryFilter(nodeId: string) {
  return { AND: [{ key: "nodeId", value: nodeId, filterType: "metadata" as const }] };
}

export async function getNodeStatus(node: RoadmapNode): Promise<NodeStatus> {
  const containerTag = containerTagFor(node.subjectId);
  const nodeFilter = nodeMemoryFilter(node.id);

  const [profile, search] = await Promise.all([
    sm.profile({ containerTag, filters: nodeFilter }),
    sm.search.documents({
      containerTags: [containerTag],
      q: node.title,
      filters: nodeFilter,
      limit: 50,
    }),
  ]);

  const docs: NodeDoc[] = [];
  let lastStudiedAt: Date | null = null;
  let lastCorrectionAt: Date | null = null;

  for (const result of search.results ?? []) {
    const metadata = result.metadata as Record<string, unknown> | null;
    const createdAtClient =
      typeof metadata?.createdAtClient === "string" ? new Date(metadata.createdAtClient) : null;
    const wasCorrection = metadata?.wasCorrection === true;

    docs.push({
      content: result.chunks?.map((c) => c.content).join("\n") ?? "",
      wasCorrection,
      turnRole: typeof metadata?.turnRole === "string" ? metadata.turnRole : null,
      createdAtClient,
    });

    if (createdAtClient) {
      if (!lastStudiedAt || createdAtClient > lastStudiedAt) lastStudiedAt = createdAtClient;
      if (wasCorrection && (!lastCorrectionAt || createdAtClient > lastCorrectionAt)) {
        lastCorrectionAt = createdAtClient;
      }
    }
  }

  const state = deriveNodeState({
    static: profile.profile.static,
    dynamic: profile.profile.dynamic,
    lastStudiedAt,
    lastCorrectionAt,
  });

  return {
    node,
    state,
    staticFacts: profile.profile.static,
    dynamic: profile.profile.dynamic,
    lastStudiedAt,
    lastCorrectionAt,
    docs,
  };
}
