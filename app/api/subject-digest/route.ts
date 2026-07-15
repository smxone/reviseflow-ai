// GET /api/subject-digest?subjectId=gate_os
// Returns a compact overview for one subject before a study session.
import { NextRequest, NextResponse } from "next/server";
import { sm, containerTagFor } from "@/lib/supermemory";

export async function GET(req: NextRequest) {
  const subjectId = req.nextUrl.searchParams.get("subjectId");
  if (!subjectId) {
    return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
  }

  try {
    const profile = await sm.profile({ containerTag: containerTagFor(subjectId), q: subjectId });
    return NextResponse.json({ subjectId, static: profile.profile.static, dynamic: profile.profile.dynamic });
  } catch (error) {
    console.error("/api/subject-digest failed", error);
    return NextResponse.json({ error: "Failed to load subject digest" }, { status: 502 });
  }
}
