// Spike C (relationships) — MVP_FINAL_SPEC.md §B6.
// Add memories across two genuinely related topics; call search.memories() and confirm the
// engine surfaces the cross-topic link with usable strength. Run with: bun run scripts/spike-relationships.ts
import { sm } from "../lib/supermemory";

const TAG = "user1_spike_c";

async function main() {
  // Topic 1: page-replacement (OS theory)
  await sm.add({
    content:
      "I studied the LRU (Least Recently Used) page replacement algorithm. When memory is full, the OS evicts the page that hasn't been used for the longest time, tracked via a recency ordering.",
    containerTag: TAG,
    metadata: { subjectId: "gate_os", nodeId: "page-replacement", isTangent: false, wasCorrection: false, source: "chat" },
  });
  await sm.add({
    content:
      "Page replacement policies decide which page to evict from physical memory when a new page must be loaded and no free frame is available.",
    containerTag: TAG,
    metadata: { subjectId: "gate_os", nodeId: "page-replacement", isTangent: false, wasCorrection: false, source: "chat" },
  });

  // Topic 2: a genuinely related but differently-labeled DSA/caching concept
  await sm.add({
    content:
      "I implemented an LRU cache using a doubly linked list plus a hash map, giving O(1) get and put by evicting the least recently used entry from the tail when the cache is full.",
    containerTag: TAG,
    metadata: { subjectId: "dsa", nodeId: "lru-cache-design", isTangent: false, wasCorrection: false, source: "chat" },
  });
  await sm.add({
    content:
      "Cache eviction policies (LRU, LFU, FIFO) determine which entry to remove when a cache reaches capacity and a new item needs to be inserted.",
    containerTag: TAG,
    metadata: { subjectId: "dsa", nodeId: "lru-cache-design", isTangent: false, wasCorrection: false, source: "chat" },
  });

  console.log("Waiting 8s for indexing...");
  await new Promise((r) => setTimeout(r, 8000));

  // Query using ONLY page-replacement framing — see if the DSA-tagged caching memories surface.
  const result = await sm.search.memories({ q: "page replacement eviction policy which page to remove", containerTag: TAG });
  console.log("\n=== SEARCH.MEMORIES (query framed around page-replacement) ===");
  console.log(JSON.stringify(result, null, 2));

  const crossTopicHits = (result.results ?? []).filter((r: any) => r.metadata?.nodeId === "lru-cache-design");
  console.log(`\nCross-topic hits (nodeId=lru-cache-design) surfaced for a page-replacement-framed query: ${crossTopicHits.length}`);
  crossTopicHits.forEach((r: any) => console.log(`  - similarity=${r.similarity} :: "${r.memory}"`));
}

main().catch((e) => {
  console.error("SPIKE C FAILED:", e);
  process.exit(1);
});
