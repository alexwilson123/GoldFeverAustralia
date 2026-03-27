import { NextResponse } from "next/server";
import { getSourceCatalog } from "@/lib/data-sources";

export async function GET() {
  return NextResponse.json({
    sources: getSourceCatalog(),
    fetchedAt: new Date().toISOString()
  });
}
