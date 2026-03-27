import type { Feature, FeatureCollection, Geometry } from "geojson";

export type ServiceKind = "WFS" | "WMS";
export type Jurisdiction =
  | "National"
  | "NSW"
  | "VIC"
  | "QLD"
  | "WA"
  | "SA"
  | "TAS"
  | "NT";

export type CommodityFilter =
  | "gold"
  | "silver"
  | "platinum"
  | "opal"
  | "sapphire"
  | "ruby"
  | "emerald"
  | "diamond"
  | "gems"
  | "all";

export type TenementStatusFilter = "all" | "active" | "expired" | "pending";
export type TimePeriodFilter = "all" | "historical" | "current";

export interface DataService {
  id: string;
  name: string;
  jurisdiction: Jurisdiction;
  kind: ServiceKind;
  description: string;
  sourceUrl: string;
  documentationUrl: string;
  capabilitiesCandidates: string[];
  defaultLayerHints: string[];
  tags: string[];
  licence: string;
}

export interface LayerSummary {
  name: string;
  title: string;
  abstract?: string;
  keywords: string[];
  queryable?: boolean;
  defaultCrs?: string;
  bbox?: [number, number, number, number];
}

export interface ServiceCapabilities {
  serviceId: string;
  resolvedUrl: string;
  kind: ServiceKind;
  title: string;
  abstract?: string;
  providerName?: string;
  layers: LayerSummary[];
  fetchedAt: string;
}

export interface ActiveLayerSelection {
  serviceId: string;
  serviceKind: ServiceKind;
  layerName: string;
  visible: boolean;
}

export interface AppFilters {
  state: Jurisdiction | "All";
  commodity: CommodityFilter;
  timePeriod: TimePeriodFilter;
  tenementStatus: TenementStatusFilter;
  historicalInactivityYears: number;
}

export interface QueryArea {
  geojson: Feature<Geometry> | FeatureCollection;
  bbox: [number, number, number, number];
}

export interface ProspectCandidate {
  id: string;
  name: string;
  confidence: number;
  score: number;
  reasoning: string[];
  risks: string[];
  sourceFeatures: Array<{
    source: string;
    layer: string;
    name: string;
    url?: string;
  }>;
  geometry: Geometry;
  properties: Record<string, unknown>;
}

export interface AnalysisResponse {
  summary: string;
  method: "heuristic" | "llm";
  warnings: string[];
  supportingFeatureCount: number;
  candidates: ProspectCandidate[];
  mapOverlay: FeatureCollection;
}
