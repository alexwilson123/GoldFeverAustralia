import type { Feature, FeatureCollection, Geometry } from "geojson";
import { NextRequest, NextResponse } from "next/server";
import { heuristicProspectingAnalysis } from "@/lib/analysis";
import { getMaxFeatureLimit } from "@/lib/cache";
import { bboxFromFeatureCollection } from "@/lib/geo";
import { rewriteAnalysisWithLlm } from "@/lib/llm";
import { getGeoJsonFeatures } from "@/lib/ogc";

const analysisTargets = [
  { serviceId: "ga-wfs", layerName: "erl:MineView" },
  { serviceId: "ga-wfs", layerName: "erl:MineralOccurrenceView" },
  { serviceId: "nsw-wfs", layerName: "mt:MineralTenement" },
  { serviceId: "nsw-wfs", layerName: "mo:MinOccView" },
  { serviceId: "qld-wfs", layerName: "erl:MineView" }
];

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    prompt: string;
    areaGeojson?: FeatureCollection | Feature<Geometry>;
    inactivityYears?: number;
  };

  if (!body.prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  const bbox = body.areaGeojson
    ? bboxFromFeatureCollection(body.areaGeojson)
    : ([112, -44, 154, -10] as [number, number, number, number]);
  const inactivityYears = body.inactivityYears ?? 35;
  const count = Math.min(60, getMaxFeatureLimit());

  const collections = await Promise.all(
    analysisTargets.map(async ({ serviceId, layerName }) => {
      try {
        return await getGeoJsonFeatures({
          serviceId,
          layerName,
          bbox,
          count
        });
      } catch {
        return {
          type: "FeatureCollection",
          features: []
        } as FeatureCollection;
      }
    })
  );

  const features = collections.flatMap((collection, index) => {
    const target = analysisTargets[index];
    return (collection.features ?? []).map((feature) => ({
      ...feature,
      properties: {
        ...(feature.properties ?? {}),
        "@serviceName": target.serviceId,
        "@layerName": target.layerName
      }
    })) as Array<Feature<Geometry>>;
  });

  const heuristic = heuristicProspectingAnalysis({
    features,
    inactivityYears
  });

  const final = await rewriteAnalysisWithLlm({
    prompt: body.prompt,
    draft: heuristic
  });

  return NextResponse.json(final, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
