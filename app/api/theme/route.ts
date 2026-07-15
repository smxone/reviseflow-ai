// GET /api/theme — unrelated presentation preference endpoint.
import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({ theme: "system", updatedAt: new Date().toISOString() });
}
