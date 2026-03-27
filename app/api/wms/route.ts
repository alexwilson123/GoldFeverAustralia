import { NextRequest, NextResponse } from "next/server";
import { getSourceById } from "@/lib/data-sources";
import { resolveCapabilitiesEndpoint } from "@/lib/ogc";

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  if (!serviceId) {
    return NextResponse.json({ error: "serviceId is required" }, { status: 400 });
  }

  const service = getSourceById(serviceId);
  if (!service || service.kind !== "WMS") {
    return NextResponse.json({ error: "Unknown WMS service" }, { status: 400 });
  }

  try {
    const resolved = await resolveCapabilitiesEndpoint(serviceId);
    const upstream = new URL(resolved.url);
    request.nextUrl.searchParams.forEach((value, key) => {
      if (key !== "serviceId") {
        upstream.searchParams.set(key, value);
      }
    });

    if (!upstream.searchParams.has("service")) {
      upstream.searchParams.set("service", "WMS");
    }

    const response = await fetch(upstream, {
      headers: {
        "User-Agent": "AussieProspect AI/1.0"
      },
      next: {
        revalidate: Number(process.env.CACHE_TTL_SECONDS ?? "1800")
      }
    });

    if (!response.ok) {
      throw new Error(`WMS proxy failed with ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "s-maxage=1800, stale-while-revalidate=3600"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "WMS proxy failed" },
      { status: 502 }
    );
  }
}
