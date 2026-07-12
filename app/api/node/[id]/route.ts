// GET /api/node/[id] - node state + synthesized facts, via the shared lib/node-status.ts helper.
import { NextRequest, NextResponse } from "next/server";
import { getNode } from "@/lib/roadmap-data";
import { getNodeStatus } from "@/lib/node-status";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const node = getNode(id);
  if (!node) {
    return NextResponse.json({ error: `Unknown nodeId: ${id}` }, { status: 404 });
  }

  try {
    const status = await getNodeStatus(node);
    return NextResponse.json({
      nodeId: id,
      title: node.title,
      state: status.state,
      static: status.staticFacts,
      dynamic: status.dynamic,
      lastStudiedAt: status.lastStudiedAt?.toISOString() ?? null,
    });
  } catch (e) {
    console.error(`/api/node/${id} failed:`, e);
    return NextResponse.json({ error: "Failed to load node state" }, { status: 502 });
  }
}
