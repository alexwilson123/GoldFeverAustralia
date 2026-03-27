import type { Feature, Geometry, Point } from "geojson";
import { bboxFromFeatureCollection, featureCollection, getGeometryCenter } from "@/lib/geo";
import type { AnalysisResponse, ProspectCandidate } from "@/lib/types";

function scoreFeature(feature: Feature, inactivityYears: number) {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const text = Object.values(props).join(" ").toLowerCase();
  let score = 40;

  if (/gold|silver|opal|diamond|sapphire|ruby|emerald|platinum/.test(text)) score += 30;
  if (/historic|historical|closed|abandoned|old workings/.test(text)) score += 20;
  if (/expired|relinquished/.test(text)) score += 16;
  if (/granted|active|operating/.test(text)) score -= 18;

  const yearMatch = text.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/g);
  if (yearMatch?.length) {
    const newest = Math.max(...yearMatch.map((item) => Number(item)));
    const yearsSince = new Date().getUTCFullYear() - newest;
    if (yearsSince >= inactivityYears) score += 18;
  }

  return Math.max(0, Math.min(100, score));
}

function buildRiskList(feature: Feature) {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  const text = Object.values(props).join(" ").toLowerCase();

  const risks = [
    "Informational use only. Always verify current tenement, land access and heritage constraints.",
    "A fossicking permit, landholder permission or other approvals may be required before entry or collection."
  ];

  if (/private|owner/.test(text)) {
    risks.push("Private land or tenure holder permissions may apply in this area.");
  }

  if (/national park|reserve|conservation/.test(text)) {
    risks.push("Environmental or reserve restrictions may limit prospecting or access.");
  }

  return risks;
}

function featureName(feature: Feature) {
  const props = (feature.properties ?? {}) as Record<string, unknown>;
  return String(props.name ?? props.title ?? props.identifier ?? "Prospect candidate");
}

export function heuristicProspectingAnalysis({
  features,
  inactivityYears
}: {
  features: Feature[];
  inactivityYears: number;
}): AnalysisResponse {
  const ranked = features
    .filter((feature): feature is Feature<Geometry> => Boolean(feature.geometry))
    .map((feature) => ({ feature, score: scoreFeature(feature, inactivityYears) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const candidates: ProspectCandidate[] = ranked.map(({ feature, score }, index) => {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const [lat, lng] = getGeometryCenter(feature.geometry);

    return {
      id: `${feature.id ?? featureName(feature)}-${index}`,
      name: featureName(feature),
      confidence: Number((score / 100).toFixed(2)),
      score,
      reasoning: [
        `${featureName(feature)} is associated with ${String(props.commodity ?? "a prospecting-relevant commodity")} in the source data.`,
        "The feature text suggests historical or low-current activity, which can be useful for amateur research when access is lawful.",
        "This candidate was ranked by commodity relevance, historical wording, and signs of lapsed or low recent tenure activity."
      ],
      risks: buildRiskList(feature),
      sourceFeatures: [
        {
          source: String(props["@serviceName"] ?? "Official government service"),
          layer: String(props["@layerName"] ?? props["@featureType"] ?? "Layer"),
          name: featureName(feature),
          url: typeof props.identifier === "string" ? props.identifier : undefined
        }
      ],
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      } as Point,
      properties: props
    };
  });

  const overlay = featureCollection(
    candidates.map((candidate) => ({
      type: "Feature" as const,
      id: candidate.id,
      geometry: candidate.geometry,
      properties: {
        name: candidate.name,
        score: candidate.score,
        confidence: candidate.confidence,
        reasoning: candidate.reasoning.join(" "),
        risks: candidate.risks.join(" ")
      }
    }))
  );

  const bbox = bboxFromFeatureCollection(overlay);

  return {
    summary: candidates.length
      ? "Ranked higher-potential areas inside the selected search extent using historical activity, commodity relevance and signs of weaker current tenure pressure."
      : "No clear historical mine or occurrence candidates were found in the selected area from the layers queried.",
    method: "heuristic",
    warnings: [
      "This output does not confirm legal access, active tenure status, environmental approvals or safety conditions.",
      `Candidates were biased toward features that appear inactive for roughly ${inactivityYears}+ years where that could be inferred from source text.`,
      `Overlay extent: ${bbox.map((value) => value.toFixed(3)).join(", ")}`
    ],
    supportingFeatureCount: features.length,
    candidates,
    mapOverlay: overlay
  };
}
