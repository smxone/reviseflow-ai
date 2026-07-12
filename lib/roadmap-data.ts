// Static GATE OS (+ a few DSA) roadmap node definitions.
// GATE OS map + a couple of DSA nodes purely so the Connect beat has a non-obvious cross-subject

export interface RoadmapNode {
  id: string;
  subjectId: string;
  title: string;
  parentId: string | null;
  prerequisiteIds: string[];
  description: string;
}

const GATE_OS_NODES: RoadmapNode[] = [
  {
    id: "os-intro",
    subjectId: "gate_os",
    title: "Introduction to Operating Systems",
    parentId: null,
    prerequisiteIds: [],
    description: "What an OS does: resource management, abstraction over hardware, kernel vs user mode.",
  },
  {
    id: "process-management",
    subjectId: "gate_os",
    title: "Processes & Threads",
    parentId: null,
    prerequisiteIds: ["os-intro"],
    description: "Process states, PCB, context switching, threads vs processes.",
  },
  {
    id: "cpu-scheduling",
    subjectId: "gate_os",
    title: "CPU Scheduling",
    parentId: null,
    prerequisiteIds: ["process-management"],
    description: "FCFS, SJF, Round Robin, Priority scheduling, and their trade-offs.",
  },
  {
    id: "process-synchronization",
    subjectId: "gate_os",
    title: "Process Synchronization",
    parentId: null,
    prerequisiteIds: ["process-management"],
    description: "Race conditions, critical sections, semaphores, monitors.",
  },
  {
    id: "deadlocks",
    subjectId: "gate_os",
    title: "Deadlocks",
    parentId: null,
    prerequisiteIds: ["process-synchronization"],
    description: "Necessary conditions, deadlock prevention/avoidance/detection, Banker's algorithm.",
  },
  {
    id: "memory-management",
    subjectId: "gate_os",
    title: "Memory Management",
    parentId: null,
    prerequisiteIds: ["os-intro"],
    description: "Contiguous allocation, paging, segmentation, address translation.",
  },
  {
    id: "virtual-memory",
    subjectId: "gate_os",
    title: "Virtual Memory",
    parentId: null,
    prerequisiteIds: ["memory-management"],
    description: "Demand paging, page faults, thrashing, working set model.",
  },
  {
    id: "page-replacement",
    subjectId: "gate_os",
    title: "Page Replacement Algorithms",
    parentId: null,
    prerequisiteIds: ["virtual-memory"],
    description: "FIFO, LRU, Optimal, and Clock - which page to evict on a page fault.",
  },
  {
    id: "file-systems",
    subjectId: "gate_os",
    title: "File Systems",
    parentId: null,
    prerequisiteIds: ["os-intro"],
    description: "File allocation methods, directory structures, inodes.",
  },
  {
    id: "disk-scheduling",
    subjectId: "gate_os",
    title: "Disk Scheduling",
    parentId: null,
    prerequisiteIds: ["file-systems"],
    description: "FCFS, SSTF, SCAN, C-SCAN disk arm scheduling algorithms.",
  },
];

// A few DSA nodes solely to give the Connect beat (E2) a genuine, non-obvious cross-subject
const DSA_NODES: RoadmapNode[] = [
  {
    id: "hashing",
    subjectId: "dsa",
    title: "Hashing & Hash Maps",
    parentId: null,
    prerequisiteIds: [],
    description: "Hash functions, collision handling, O(1) average-case lookup.",
  },
  {
    id: "linked-lists",
    subjectId: "dsa",
    title: "Linked Lists",
    parentId: null,
    prerequisiteIds: [],
    description: "Singly/doubly linked lists, O(1) insert/remove given a node reference.",
  },
  {
    id: "lru-cache-design",
    subjectId: "dsa",
    title: "LRU Cache Design",
    parentId: null,
    prerequisiteIds: ["hashing", "linked-lists"],
    description: "Combining a hash map + doubly linked list for O(1) get/put with least-recently-used eviction.",
  },
];

export const ROADMAP_NODES: RoadmapNode[] = [...GATE_OS_NODES, ...DSA_NODES];

export function getNode(id: string): RoadmapNode | undefined {
  return ROADMAP_NODES.find((n) => n.id === id);
}

export function getNodesBySubject(subjectId: string): RoadmapNode[] {
  return ROADMAP_NODES.filter((n) => n.subjectId === subjectId);
}
