// Basic add -> wait -> profile -> search round-trip against Supermemory Local.
// Per docs/INFRASTRUCTURE_SETUP.md §5. Run with: bun run scripts/smoke.ts
import { sm } from "../lib/supermemory";

async function main() {
  const add = await sm.add({
    content:
      "I am studying GATE Operating Systems. I keep confusing LRU and FIFO page replacement.",
    containerTag: "user1_gate_os",
    metadata: {
      subjectId: "gate_os",
      nodeId: "page-replacement",
      isTangent: false,
      wasCorrection: false,
      source: "chat",
    },
  });
  console.log("ADD:", JSON.stringify(add));

  // allow async indexing pipeline to progress before reading
  await new Promise((r) => setTimeout(r, 4000));

  const p = await sm.profile({ containerTag: "user1_gate_os", q: "page replacement" });
  console.log("STATIC:", p.profile.static);
  console.log("DYNAMIC:", p.profile.dynamic);

  const s = await sm.search.documents({
    q: "page replacement",
    containerTags: ["user1_gate_os"],
  });
  console.log("DOCS:", s.results?.length);
}

main().catch((e) => {
  console.error("SMOKE TEST FAILED:", e);
  process.exit(1);
});
