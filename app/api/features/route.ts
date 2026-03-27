import type { Feature, FeatureCollection, Geometry } from "geojson";
import { NextRequest, NextResponse } from "next/server";
import { getMaxFeatureLimit } from "@/lib/cache";
import { filterFeature } from "@/lib/filters";
import { getGeoJsonFeatures } from "@/lib/ogc";
import type { AppFilters } from "@/lib/types";

function parseBbox(value: string | null) {
  if (!value) return undefined;
  const parts = value.split(",").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return undefined;
  return parts as [number, number, number, number];
}

export async function GET(request: NextRequest) {
  const serviceId = request.nextUrl.searchParams.get("serviceId");
  const layerName = request.nextUrl.searchParams.get("layerName");
  const bbox = parseBbox(request.nextUrl.searchParams.get("bbox"));
  const maxFeatures = getMaxFeatureLimit();
  const count = Math.min(Number(request.nextUrl.searchParams.get("count") ?? "120"), maxFeatures);

  if (!serviceId || !layerName) {
    return NextResponse.json({ error: "serviceId and layerName are required" }, { status: 400 });
  }

  const filters: AppFilters = {
    state: (request.nextUrl.searchParams.get("state") as AppFilters["state"]) ?? "All",
    commodity: (request.nextUrl.searchParams.get("commodity") as AppFilters["commodity"]) ?? "all",
    timePeriod: (request.nextUrl.searchParams.get("timePeriod") as AppFilters["timePeriod"]) ?? "all",
    tenementStatus:
      (request.nextUrl.searchParams.get("tenementStatus") as AppFilters["tenementStatus"]) ?? "all",
    historicalInactivityYears: Number(
      request.nextUrl.searchParams.get("historicalInactivityYears") ?? "25"
    )
  };

  try {
    const raw = (await getGeoJsonFeatures({
      serviceId,
      layerName,
      bbox,
      count
    })) as FeatureCollection;

    const features = (raw.features ?? [])
      .filter((feature): feature is Feature<Geometry> => Boolean(feature?.geometry))
      .filter((feature) => filterFeature(feature, filters))
      .map((feature) => ({
        ...feature,
        properties: {
          ...(feature.properties ?? {}),
          "@serviceId": serviceId,
          "@serviceName": serviceId,
          "@layerName": layerName
        }
      }));

    return NextResponse.json(
      {
        type: "FeatureCollection",
        features,
        totalFeatures: features.length
      },
      {
        headers: {
          "Cache-Control": "s-maxage=900, stale-while-revalidate=1800"
        }
      }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Feature request failed" },
      { status: 502 }
    );
  }
}
