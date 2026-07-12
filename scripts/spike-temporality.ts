// Add a belief, then a contradicting correction; inspect how profile() vs
// search.documents() expose the superseded fact. Run with: bun run scripts/spike-temporality.ts
import { sm } from "../lib/supermemory";

const TAG = "user1_spike_a";

async function main() {
  const belief = await sm.add({
    content:
      "I believe LRU (Least Recently Used) page replacement always performs better than FIFO, in every workload.",
    containerTag: TAG,
    metadata: {
      subjectId: "gate_os",
      nodeId: "page-replacement",
      isTangent: false,
      wasCorrection: false,
      source: "chat",
    },
  });
  console.log("BELIEF ADD:", JSON.stringify(belief));

  await new Promise((r) => setTimeout(r, 4000));

  const correction = await sm.add({
    content:
      "Correction: I was wrong earlier. LRU does NOT always outperform FIFO - in pathological cyclic access patterns, FIFO can actually outperform LRU. My earlier claim that LRU always wins was incorrect.",
    containerTag: TAG,
    metadata: {
      subjectId: "gate_os",
      nodeId: "page-replacement",
      isTangent: false,
      wasCorrection: true,
      source: "chat",
    },
  });
  console.log("CORRECTION ADD:", JSON.stringify(correction));

  console.log("\nWaiting 8s for indexing...\n");
  await new Promise((r) => setTimeout(r, 8000));

  const profile = await sm.profile({ containerTag: TAG, q: "page replacement performance LRU FIFO" });
  console.log("\n=== PROFILE (raw) ===");
  console.log(JSON.stringify(profile, null, 2));

  const docs = await sm.search.documents({
    q: "page replacement performance LRU FIFO",
    containerTags: [TAG],
  });
  console.log("\n=== SEARCH.DOCUMENTS (raw) ===");
  console.log(JSON.stringify(docs, null, 2));
}

main().catch((e) => {
  console.error("SPIKE A FAILED:", e);
  process.exit(1);
});
