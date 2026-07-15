// GET /api/concept-summary?subjectId=gate_os&concept=paging
// Returns a concept summary scoped to the requested subject.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor } from "@/lib/supermemory";

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  const concept = req.nextUrl.searchParams.get("concept");
  if (!subjectId || !concept) return NextResponse.json({ error: "subjectId and concept are required" }, { status: 400 });

  try {
    const profile = await sm.profile({
      containerTag: containerTagFor(subjectId),
      q: concept,
      filters: { AND: [{ key: "subjectId", value: subjectId, filterType: "metadata" }] },
    });
    return NextResponse.json({ concept, static: profile.profile.static, dynamic: profile.profile.dynamic });
  } catch (error) {
    console.error("/api/concept-summary failed", error);
    return NextResponse.json({ error: "Failed to load concept summary" }, { status: 502 });
  }
}
