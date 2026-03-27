import { NextRequest, NextResponse } from "next/server";
import { getCapabilities } from "@/lib/ogc";

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  try {
    const capabilities = await getCapabilities(serviceId);
    return NextResponse.json(capabilities, {
      headers: {
        "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600"
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unknown capabilities error"
      },
      { status: 502 }
    );
  }
}
