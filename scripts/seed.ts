// Seeds a realistic ~3-week GATE OS journey (+ a few DSA nodes) so the demo opens in a rich state
//
//  - The engine can't backdate its own timestamps, so staleness is driven by OUR `createdAtClient`.
//    `daysAgo > 7` (FADING_THRESHOLD_DAYS) → Fading; recent → Mastered/Learning.
//  - "Substance" (masterable) needs >= 4 engine-extracted facts, so substance nodes get several
//    fact-dense memories; Learning nodes get just one.
//  - Shaky = the LATEST memory on a node is a correction: page-replacement gets an old belief then
//    a recent wasCorrection memory.
//  - Connect needs a real cross-topic overlap: page-replacement (LRU eviction) and the DSA
import { sm, addStudyMemory, containerTagFor, type StudyMemoryMetadata } from "../lib/supermemory";

interface Seed {
  nodeId: string;
  subjectId: string;
  daysAgo: number;
  content: string;
  concepts?: string[];
  wasCorrection?: boolean;
  turnRole?: "user" | "assistant";
}

const SEEDS: Seed[] = [
  // ── os-intro → Mastered (foundational, reinforced recently) ─────────────
  { nodeId: "os-intro", subjectId: "gate_os", daysAgo: 20, concepts: ["kernel mode", "system calls"],
    content: "An operating system manages hardware resources and provides abstraction. The kernel runs in privileged mode; user programs run in user mode and request services via system calls, which trap into the kernel." },
  { nodeId: "os-intro", subjectId: "gate_os", daysAgo: 18, concepts: ["context switch", "dual mode"],
    content: "The mode bit distinguishes kernel mode from user mode. A context switch saves the current process state and loads another; it is pure overhead, doing no useful work itself." },
  { nodeId: "os-intro", subjectId: "gate_os", daysAgo: 2, concepts: ["resource management", "abstraction"],
    content: "Revisited OS fundamentals: the OS is both a resource manager (CPU, memory, I/O) and an extended machine that hides hardware complexity behind clean abstractions like processes and files." },

  // ── process-management → Fading (studied ~12 days ago, not revisited) ────
  { nodeId: "process-management", subjectId: "gate_os", daysAgo: 13, concepts: ["PCB", "process states"],
    content: "A process moves through new, ready, running, waiting, and terminated states. The Process Control Block stores the PID, program counter, registers, and scheduling info for each process." },
  { nodeId: "process-management", subjectId: "gate_os", daysAgo: 12, concepts: ["threads", "context switch"],
    content: "Threads share the process address space and files but have their own stack and registers, so thread switches are cheaper than process switches. This is the basis of concurrency within a process." },
  { nodeId: "process-management", subjectId: "gate_os", daysAgo: 12, concepts: ["fork", "zombie process"],
    content: "fork() creates a child that is a copy of the parent. A zombie is a terminated child whose exit status the parent has not yet reaped with wait()." },

  // ── cpu-scheduling → Fading (the Quiz hero - clearly forgotten) ──────────
  { nodeId: "cpu-scheduling", subjectId: "gate_os", daysAgo: 15, concepts: ["round robin", "time quantum"],
    content: "Round Robin gives each process a fixed time quantum then preempts it. Too large a quantum degenerates to FCFS; too small a quantum wastes time on context switches." },
  { nodeId: "cpu-scheduling", subjectId: "gate_os", daysAgo: 14, concepts: ["SJF", "starvation", "waiting time"],
    content: "Shortest Job First gives the minimum average waiting time but can starve long processes. It requires knowing burst times in advance, which is usually impossible." },
  { nodeId: "cpu-scheduling", subjectId: "gate_os", daysAgo: 14, concepts: ["priority scheduling", "aging"],
    content: "Priority scheduling runs the highest-priority process first; aging gradually raises the priority of waiting processes to prevent starvation. Preemptive priority can still cause priority inversion." },

  // ── page-replacement → Shaky (belief, then a recent correction) ─────────
  { nodeId: "page-replacement", subjectId: "gate_os", daysAgo: 10, concepts: ["LRU", "FIFO", "page fault", "eviction"],
    content: "On a page fault with no free frame, a replacement algorithm evicts a page. FIFO evicts the oldest-loaded page; LRU evicts the least recently used page. I believe LRU always beats FIFO." },
  { nodeId: "page-replacement", subjectId: "gate_os", daysAgo: 10, concepts: ["Belady's anomaly", "stack algorithm", "optimal"],
    content: "FIFO can suffer Belady's anomaly, where adding frames increases faults. LRU is a stack algorithm and is immune to it. The optimal algorithm evicts the page used farthest in the future." },
  { nodeId: "page-replacement", subjectId: "gate_os", daysAgo: 2, wasCorrection: true,
    concepts: ["LRU", "FIFO", "cyclic access", "least recently used"],
    content: "Correction: I was wrong that LRU always beats FIFO. Under cyclic access patterns that exceed the number of frames, LRU can fault on every access while FIFO does better. LRU is a heuristic, not a guarantee." },

  // ── file-systems → Fading ───────────────────────────────────────────────
  { nodeId: "file-systems", subjectId: "gate_os", daysAgo: 11, concepts: ["inode", "allocation methods"],
    content: "An inode stores a file's metadata and pointers to its data blocks. Allocation methods include contiguous (fast, fragmentation-prone), linked (no random access), and indexed (inode-style)." },
  { nodeId: "file-systems", subjectId: "gate_os", daysAgo: 11, concepts: ["directory", "hard link"],
    content: "A directory maps names to inode numbers. A hard link is another name for the same inode; the file's data is freed only when its link count reaches zero." },
  { nodeId: "file-systems", subjectId: "gate_os", daysAgo: 10, concepts: ["indexed allocation", "block pointers"],
    content: "Indexed allocation keeps all block pointers in an index block, enabling random access without external fragmentation, at the cost of index-block overhead for small files." },

  // ── memory-management → Mastered (recent) ───────────────────────────────
  { nodeId: "memory-management", subjectId: "gate_os", daysAgo: 4, concepts: ["paging", "TLB", "address translation"],
    content: "Paging splits memory into fixed frames and logical memory into pages. The page table maps page numbers to frames; the TLB caches recent translations to avoid a second memory access." },
  { nodeId: "memory-management", subjectId: "gate_os", daysAgo: 3, concepts: ["segmentation", "external fragmentation"],
    content: "Segmentation divides memory by logical units of variable size, which causes external fragmentation. Paging avoids external fragmentation but causes internal fragmentation within the last frame." },
  { nodeId: "memory-management", subjectId: "gate_os", daysAgo: 3, concepts: ["multilevel page table", "page size"],
    content: "Multilevel page tables shrink the memory footprint of large sparse address spaces. Larger pages reduce page-table size but increase internal fragmentation." },

  // ── virtual-memory → Mastered (recent) ──────────────────────────────────
  { nodeId: "virtual-memory", subjectId: "gate_os", daysAgo: 3, concepts: ["demand paging", "page fault"],
    content: "Demand paging loads a page only when it is first referenced. A page fault traps to the OS, which fetches the page from disk, updates the page table, and restarts the instruction." },
  { nodeId: "virtual-memory", subjectId: "gate_os", daysAgo: 2, concepts: ["thrashing", "working set"],
    content: "Thrashing happens when processes spend more time paging than executing because the sum of their working sets exceeds physical memory. The working-set model bounds allocation to recent references." },
  { nodeId: "virtual-memory", subjectId: "gate_os", daysAgo: 2, concepts: ["effective access time", "locality"],
    content: "Effective access time weights memory and page-fault service time by the fault rate, so a tiny fault rate still hurts a lot. Locality of reference is why demand paging works at all." },

  // ── process-synchronization → Learning (just started) ───────────────────
  { nodeId: "process-synchronization", subjectId: "gate_os", daysAgo: 3, concepts: ["critical section", "semaphore"],
    content: "A semaphore is an integer with atomic wait and signal operations used to protect a critical section. A binary semaphore acts as a mutex lock." },

  // ── deadlocks → Learning ────────────────────────────────────────────────
  { nodeId: "deadlocks", subjectId: "gate_os", daysAgo: 4, concepts: ["coffman conditions", "circular wait"],
    content: "Deadlock needs four conditions together: mutual exclusion, hold-and-wait, no preemption, and circular wait. Breaking any one prevents deadlock." },

  // ── DSA: lru-cache-design → Mastered, and the Connect overlap target ─────
  { nodeId: "lru-cache-design", subjectId: "dsa", daysAgo: 6, concepts: ["LRU", "doubly linked list", "hash map", "eviction"],
    content: "An LRU cache combines a hash map (key → node) with a doubly linked list ordered by recency. get and put are O(1); on capacity overflow you evict the least recently used entry from the list tail." },
  { nodeId: "lru-cache-design", subjectId: "dsa", daysAgo: 5, concepts: ["least recently used", "O(1) eviction"],
    content: "Moving a node to the head on every access keeps the most recently used items near the front, so the least recently used item is always at the tail - enabling O(1) eviction." },
  { nodeId: "lru-cache-design", subjectId: "dsa", daysAgo: 5, concepts: ["cache eviction policy", "LFU"],
    content: "Cache eviction policies decide what to remove when full: LRU evicts by recency, LFU by frequency, FIFO by insertion order. LRU assumes recent use predicts future use." },

  // ── DSA: hashing / linked-lists → Learning (prereqs of lru-cache) ───────
  { nodeId: "hashing", subjectId: "dsa", daysAgo: 6, concepts: ["hash function", "collision", "chaining"],
    content: "A hash map gives O(1) average lookup by hashing keys to buckets. Collisions are resolved by chaining or open addressing; a bad hash function degrades to O(n)." },
  { nodeId: "linked-lists", subjectId: "dsa", daysAgo: 6, concepts: ["doubly linked list", "O(1) insert"],
    content: "A doubly linked list allows O(1) insertion and removal given a reference to a node, because each node points to both its predecessor and successor." },
];

function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function factCount(subjectId: string, nodeId: string): Promise<number> {
  const p = await sm.profile({
    containerTag: containerTagFor(subjectId),
    filters: { AND: [{ key: "nodeId", value: nodeId, filterType: "metadata" as const }] },
  });
  return p.profile.static.length + p.profile.dynamic.length;
}

// The engine's memory-fact extraction is an LLM call per memory and can silently drop under load
// (docs still index, but profile() stays empty → the node never leaves Unstarted). So we seed
// NODE-BY-NODE and CONFIRM each node actually produced facts before moving on, retrying idempotently
// via customId if it didn't. This guarantees the demo opens in the intended state.
async function seedNode(nodeId: string, seeds: Seed[]): Promise<boolean> {
  const subjectId = seeds[0].subjectId;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (let idx = 0; idx < seeds.length; idx++) {
      const s = seeds[idx];
      const metadata: StudyMemoryMetadata = {
        subjectId: s.subjectId,
        nodeId: s.nodeId,
        isTangent: false,
        wasCorrection: s.wasCorrection ?? false,
        concepts: s.concepts,
        source: "chat",
        turnRole: s.turnRole ?? "user",
        createdAtClient: isoDaysAgo(s.daysAgo),
      };
      await addStudyMemory({
        content: s.content,
        containerTag: containerTagFor(subjectId),
        customId: `seed-${nodeId}-${idx}`, // idempotent - a retry updates in place, no duplicates
        metadata,
      });
      await sleep(1500);
    }
    // Poll for extraction to land (up to ~48s).
    for (let t = 0; t < 12; t++) {
      await sleep(4000);
      const count = await factCount(subjectId, nodeId);
      if (count > 0) {
        console.log(`  ${nodeId.padEnd(24)} ${count} facts (attempt ${attempt})`);
        return true;
      }
    }
    console.log(`  ${nodeId.padEnd(24)} no facts yet - ${attempt < 3 ? "retrying" : "giving up"}`);
  }
  return false;
}

async function main() {
  // Optional targeted top-up: `bun run scripts/seed.ts cpu-scheduling lru-cache-design`
  // seeds only those nodes. Extraction sometimes drops silently under load; re-running for just
  // the affected nodes re-triggers it without re-saturating the whole pipeline. Idempotent.
  const only = process.argv.slice(2);

  const byNode = new Map<string, Seed[]>();
  for (const s of SEEDS) {
    if (only.length && !only.includes(s.nodeId)) continue;
    const arr = byNode.get(s.nodeId) ?? [];
    arr.push(s);
    byNode.set(s.nodeId, arr);
  }

  console.log(`Seeding ${byNode.size} node(s) (${[...byNode.values()].flat().length} memories), confirming each…`);
  const failed: string[] = [];
  for (const [nodeId, seeds] of byNode) {
    const ok = await seedNode(nodeId, seeds);
    if (!ok) failed.push(nodeId);
  }

  if (failed.length) {
    console.log(`\nWARNING: these nodes never produced facts: ${failed.join(", ")}`);
    console.log("Re-run `bun run scripts/seed.ts` (it's idempotent) to top them up.");
  } else {
    console.log("\nAll nodes seeded and confirmed. The map is demo-ready.");
  }
}

main().catch((e) => {
  console.error("SEED FAILED:", e);
  process.exit(1);
});
