// GET /api/study-checkpoint?nodeId=page-replacement
// Returns a compact checkpoint before a learner resumes a roadmap node.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor } from "@/lib/supermemory";
import { getNode } from "@/lib/roadmap-data";

export async function GET(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get("nodeId");
  const node = nodeId ? getNode(nodeId) : undefined;
  if (!node) {
    return NextResponse.json({ error: "A valid nodeId is required" }, { status: 400 });
  }

  try {
    const profile = await sm.profile({
      containerTag: containerTagFor(node.subjectId),
      q: node.title,
    });
    return NextResponse.json({
      nodeId: node.id,
      title: node.title,
      static: profile.profile.static,
      dynamic: profile.profile.dynamic,
    });
  } catch (error) {
    console.error("/api/study-checkpoint failed", error);
    return NextResponse.json({ error: "Failed to load study checkpoint" }, { status: 502 });
  }
}
