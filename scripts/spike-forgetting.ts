// Spike B (forgetting/staleness) — MVP_FINAL_SPEC.md §B6.
// Determine the real decay signal on the LOCAL engine: age field? static->dynamic->absent
// demotion? explicit expiry? Run with: bun run scripts/spike-forgetting.ts
//
// Finding: memories.forget()/updateMemory({forgetAfter}) require the MEMORY id (the extracted
// atomic fact, from profile().searchResults[].id), not the original document content — content-
// based matching 404s because the engine's extracted memory text differs from what we submitted.
import { sm } from "../lib/supermemory";

const TAG = "user1_spike_b";

async function main() {
  const add = await sm.add({
    content: "I studied Round Robin CPU scheduling and its time quantum trade-offs.",
    containerTag: TAG,
    metadata: { subjectId: "gate_os", nodeId: "cpu-scheduling", isTangent: false, wasCorrection: false, source: "chat" },
  });
  console.log("ADD:", JSON.stringify(add));

  await new Promise((r) => setTimeout(r, 4000));
  const profile1 = await sm.profile({ containerTag: TAG, q: "round robin scheduling" });
  console.log("\n=== PROFILE after 4s (static/dynamic placement) ===");
  console.log(JSON.stringify(profile1.profile, null, 2));

  // No forgetAfter set yet — confirm the fact persists unchanged with no organic decay over a further wait.
  await new Promise((r) => setTimeout(r, 8000));
  const profile2 = await sm.profile({ containerTag: TAG, q: "round robin scheduling" });
  console.log("\n=== PROFILE after +8s more (checking for any organic staleness signal) ===");
  console.log(JSON.stringify(profile2.profile, null, 2));

  const targetId = profile2.searchResults?.results?.[0]?.id;
  console.log("\ntarget memory id for expiry test:", targetId);

  // Explicit expiry: forgetAfter must be a future timestamp (validated server-side).
  const futureExpiry = new Date(Date.now() + 3000).toISOString();
  const updated = await sm.memories.updateMemory({
    containerTag: TAG,
    id: targetId,
    newContent: "The user studied Round Robin CPU scheduling.",
    forgetAfter: futureExpiry,
    forgetReason: "spike-b-explicit-expiry-test",
  });
  console.log("\n=== updateMemory(forgetAfter=+3s) response ===");
  console.log(JSON.stringify(updated, null, 2));

  console.log("\nWaiting 6s for expiry to pass...");
  await new Promise((r) => setTimeout(r, 6000));

  const profileAfterExpiry = await sm.profile({ containerTag: TAG, q: "round robin scheduling" });
  console.log("\n=== PROFILE after forgetAfter expiry passed ===");
  console.log(JSON.stringify(profileAfterExpiry.profile.dynamic, null, 2));

  const docsAfterExpiry = await sm.search.documents({ q: "round robin scheduling", containerTags: [TAG] });
  console.log("\n=== SEARCH.DOCUMENTS after expiry (raw document, unaffected) ===");
  console.log(JSON.stringify(docsAfterExpiry.results?.map((r: any) => r.documentId), null, 2));

  // Explicit soft-delete via memories.forget(), also by id.
  const add2 = await sm.add({
    content: "I studied Priority Scheduling and starvation issues with aging.",
    containerTag: TAG,
    metadata: { subjectId: "gate_os", nodeId: "cpu-scheduling", isTangent: false, wasCorrection: false, source: "chat" },
  });
  console.log("\nADD2:", JSON.stringify(add2));
  await new Promise((r) => setTimeout(r, 4000));

  const profile3 = await sm.profile({ containerTag: TAG, q: "priority scheduling starvation aging" });
  const forgetTargetId = profile3.searchResults?.results?.find((r: any) => r.memory.includes("aging"))?.id;
  console.log("\nforget() target id:", forgetTargetId);

  const forgotten = await sm.memories.forget({ containerTag: TAG, id: forgetTargetId, reason: "spike-b-explicit-forget-test" });
  console.log("\n=== memories.forget() response ===");
  console.log(JSON.stringify(forgotten, null, 2));

  await new Promise((r) => setTimeout(r, 3000));
  const profileAfterForget = await sm.profile({ containerTag: TAG, q: "priority scheduling starvation aging" });
  console.log("\n=== PROFILE after forget() (fact should be gone) ===");
  console.log(JSON.stringify(profileAfterForget.profile.dynamic, null, 2));
}

main().catch((e) => {
  console.error("SPIKE B FAILED:", e);
  process.exit(1);
});
