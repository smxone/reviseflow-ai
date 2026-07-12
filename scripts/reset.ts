// Clears ReviseFlow's demo container tags so each seed/demo run starts clean.
// Tag-scoped (never touches the provider config or ./.supermemory wholesale) - per
import { sm } from "../lib/supermemory";
import { ROADMAP_NODES } from "../lib/roadmap-data";
import { containerTagFor } from "../lib/supermemory";

const SUBJECT_IDS = [...new Set(ROADMAP_NODES.map((n) => n.subjectId))];

async function clearTag(tag: string): Promise<number> {
  let cleared = 0;
  // Page through the tag's documents, deleting by id in chunks (ids-based delete is the stable
  // path; the containerTags-delete field is deprecated in the SDK).
  // Loop until a list call returns nothing - deletion shrinks the set each pass.
  for (let guard = 0; guard < 100; guard++) {
    const list = await sm.documents.list({ containerTags: [tag], limit: 100 });
    const ids = (list.memories ?? []).map((m) => m.id).filter(Boolean);
    if (ids.length === 0) break;
    for (let i = 0; i < ids.length; i += 100) {
      await sm.documents.deleteBulk({ ids: ids.slice(i, i + 100) });
    }
    cleared += ids.length;
    await new Promise((r) => setTimeout(r, 300)); // let deletes settle before re-listing
  }
  return cleared;
}

async function main() {
  for (const subjectId of SUBJECT_IDS) {
    const tag = containerTagFor(subjectId);
    const n = await clearTag(tag);
    console.log(`cleared ${n} document(s) from ${tag}`);
  }
  console.log("reset complete.");
}

main().catch((e) => {
  console.error("RESET FAILED:", e);
  process.exit(1);
});
