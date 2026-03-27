import type { FeatureCollection } from "geojson";
import { XMLParser } from "fast-xml-parser";
import { readCache, writeCache } from "@/lib/cache";
import { getSourceById } from "@/lib/data-sources";
import type { LayerSummary, ServiceCapabilities, ServiceKind } from "@/lib/types";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  removeNSPrefix: true,
  trimValues: true
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function toBbox(raw: unknown): [number, number, number, number] | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const minx = Number((raw as Record<string, unknown>).minx ?? (raw as Record<string, unknown>).minX);
  const miny = Number((raw as Record<string, unknown>).miny ?? (raw as Record<string, unknown>).minY);
  const maxx = Number((raw as Record<string, unknown>).maxx ?? (raw as Record<string, unknown>).maxX);
  const maxy = Number((raw as Record<string, unknown>).maxy ?? (raw as Record<string, unknown>).maxY);
  if ([minx, miny, maxx, maxy].some(Number.isNaN)) return undefined;
  return [minx, miny, maxx, maxy];
}

function pickKeywords(candidate: unknown): string[] {
  if (!candidate) return [];
  if (Array.isArray(candidate)) return candidate.flatMap((item) => pickKeywords(item));
  if (typeof candidate === "string") return [candidate];
  if (typeof candidate === "object") {
    const record = candidate as Record<string, unknown>;
    return [
      ...pickKeywords(record.Keyword),
      ...pickKeywords(record.keyword),
      ...pickKeywords(record.value)
    ];
  }
  return [];
}

function collectWmsLayers(node: Record<string, unknown>): Array<Record<string, unknown>> {
  const children = asArray(node.Layer).map((item) => item as Record<string, unknown>);
  return [
    ...children,
    ...children.flatMap((child) => collectWmsLayers(child))
  ];
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8",
      "User-Agent": "AussieProspect AI/1.0"
    },
    next: {
      revalidate: Number(process.env.CACHE_TTL_SECONDS ?? "1800")
    }
  });

  if (!response.ok) {
    throw new Error(`Capabilities request failed with ${response.status}`);
  }

  return response.text();
}

export async function resolveCapabilitiesEndpoint(serviceId: string) {
  const service = getSourceById(serviceId);
  if (!service) throw new Error(`Unknown service ${serviceId}`);

  for (const candidate of service.capabilitiesCandidates) {
    const url = new URL(candidate);
    url.searchParams.set("service", service.kind);
    url.searchParams.set("request", "GetCapabilities");

    try {
      const content = await fetchText(url.toString());
      if (content.includes("Capabilities")) {
        return { url: candidate, content };
      }
    } catch {
      continue;
    }
  }

  throw new Error(`No reachable capabilities endpoint found for ${service.name}`);
}

export async function getCapabilities(serviceId: string): Promise<ServiceCapabilities> {
  const cacheKey = `capabilities:${serviceId}`;
  const cached = readCache<ServiceCapabilities>(cacheKey);
  if (cached) return cached;

  const service = getSourceById(serviceId);
  if (!service) throw new Error(`Unknown service ${serviceId}`);

  const { url, content } = await resolveCapabilitiesEndpoint(serviceId);
  const parsed = parser.parse(content) as Record<string, unknown>;
  const capabilitiesRoot =
    (parsed.WFS_Capabilities as Record<string, unknown>) ||
    (parsed.WMS_Capabilities as Record<string, unknown>) ||
    (parsed.WMT_MS_Capabilities as Record<string, unknown>);

  const serviceNode = (capabilitiesRoot.Service as Record<string, unknown>) ?? {};
  const providerNode = (capabilitiesRoot.ServiceProvider as Record<string, unknown>) ?? {};
  let layers: LayerSummary[] = [];

  if (service.kind === "WFS") {
    const featureTypeList = (capabilitiesRoot.FeatureTypeList as Record<string, unknown>) ?? {};
    layers = asArray(featureTypeList.FeatureType).map((item) => {
      const record = item as Record<string, unknown>;
      return {
        name: String(record.Name ?? ""),
        title: String(record.Title ?? record.Name ?? "Untitled layer"),
        abstract: typeof record.Abstract === "string" ? record.Abstract : undefined,
        keywords: pickKeywords(record.Keywords),
        defaultCrs: typeof record.DefaultCRS === "string" ? record.DefaultCRS : undefined,
        bbox: toBbox(record.WGS84BoundingBox)
      };
    });
  } else {
    const capability = (capabilitiesRoot.Capability as Record<string, unknown>) ?? {};
    const layerTree = (capability.Layer as Record<string, unknown>) ?? {};
    const descendants = collectWmsLayers(layerTree);
    layers = descendants
      .filter((item) => item.Name || item.Title)
      .map((record) => ({
        name: String(record.Name ?? record.Title ?? ""),
        title: String(record.Title ?? record.Name ?? "Untitled layer"),
        abstract: typeof record.Abstract === "string" ? record.Abstract : undefined,
        keywords: pickKeywords(record.KeywordList),
        queryable: Boolean(record.queryable),
        defaultCrs: typeof record.CRS === "string" ? record.CRS : undefined,
        bbox: toBbox(record.EX_GeographicBoundingBox) ?? toBbox(record.BoundingBox)
      }));
  }

  const capabilities: ServiceCapabilities = {
    serviceId,
    resolvedUrl: url,
    kind: service.kind as ServiceKind,
    title: String(serviceNode.Title ?? service.name),
    abstract: typeof serviceNode.Abstract === "string" ? serviceNode.Abstract : service.description,
    providerName: String(providerNode.ProviderName ?? ""),
    layers,
    fetchedAt: new Date().toISOString()
  };

  writeCache(cacheKey, capabilities);
  return capabilities;
}

export async function getGeoJsonFeatures({
  serviceId,
  layerName,
  bbox,
  count = 500
}: {
  serviceId: string;
  layerName: string;
  bbox?: [number, number, number, number];
  count?: number;
}): Promise<FeatureCollection> {
  const service = getSourceById(serviceId);
  if (!service || service.kind !== "WFS") {
    throw new Error(`Service ${serviceId} is not a WFS source`);
  }

  const base = (await resolveCapabilitiesEndpoint(serviceId)).url;
  const requestUrl = new URL(base);
  requestUrl.searchParams.set("service", "WFS");
  requestUrl.searchParams.set("version", "2.0.0");
  requestUrl.searchParams.set("request", "GetFeature");
  requestUrl.searchParams.set("typeNames", layerName);
  requestUrl.searchParams.set("outputFormat", "application/json");
  requestUrl.searchParams.set("srsName", "EPSG:4326");
  requestUrl.searchParams.set("count", String(count));

  if (bbox) {
    requestUrl.searchParams.set("bbox", `${bbox.join(",")},EPSG:4326`);
  }

  const cacheKey = `features:${requestUrl.toString()}`;
  const cached = readCache<FeatureCollection>(cacheKey);
  if (cached) return cached;

  const response = await fetch(requestUrl, {
    headers: {
      Accept: "application/json",
      "User-Agent": "AussieProspect AI/1.0"
    },
    next: {
      revalidate: Number(process.env.CACHE_TTL_SECONDS ?? "1800")
    }
  });

  if (!response.ok) {
    throw new Error(`Feature request failed with ${response.status}`);
  }

  const json = (await response.json()) as FeatureCollection;
  writeCache(cacheKey, json);
  return json;
}
