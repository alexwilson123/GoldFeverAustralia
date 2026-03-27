"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { Moon, Search, Share2, Sparkles, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { FeatureCollection } from "geojson";
import { Badge, Panel } from "@/components/ui";
import { exportGeoJson, exportKml, exportPdfReport } from "@/lib/exporters";
import type {
  ActiveLayerSelection,
  AnalysisResponse,
  AppFilters,
  DataService,
  LayerSummary,
  ServiceCapabilities
} from "@/lib/types";

const ProspectMap = dynamic(() => import("@/components/map-canvas").then((mod) => mod.MapCanvas), {
  ssr: false
});

const defaultFilters: AppFilters = {
  state: "All",
  commodity: "gold",
  timePeriod: "historical",
  tenementStatus: "all",
  historicalInactivityYears: 35
};

export function Shell({ initialCatalog }: { initialCatalog: DataService[] }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [catalog] = useState(initialCatalog);
  const [capabilities, setCapabilities] = useState<Record<string, ServiceCapabilities>>({});
  const [activeLayers, setActiveLayers] = useState<ActiveLayerSelection[]>([
    { serviceId: "ga-wms", serviceKind: "WMS", layerName: "erl:MineView", visible: true },
    { serviceId: "ga-wfs", serviceKind: "WFS", layerName: "erl:MineView", visible: true },
    { serviceId: "nsw-wfs", serviceKind: "WFS", layerName: "mt:MineralTenement", visible: false }
  ]);
  const [filters, setFilters] = useState(defaultFilters);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState(
    "Find me good gold prospecting spots near old mines that appear to have low recent activity."
  );
  const [analysisArea, setAnalysisArea] = useState<FeatureCollection | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [selectedFeatureCount, setSelectedFeatureCount] = useState(0);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const onlineSources = useMemo(
    () => catalog.filter((service) => capabilities[service.id]),
    [capabilities, catalog]
  );

  async function loadCapabilities(serviceId: string) {
    if (capabilities[serviceId]) return;
    const response = await fetch(`/api/capabilities?serviceId=${serviceId}`);
    if (!response.ok) return;
    const json = (await response.json()) as ServiceCapabilities;
    setCapabilities((current) => ({ ...current, [serviceId]: json }));
  }

  function toggleLayer(serviceId: string, serviceKind: "WFS" | "WMS", layerName: string) {
    setActiveLayers((current) => {
      const existing = current.find(
        (item) => item.serviceId === serviceId && item.layerName === layerName
      );
      if (existing) {
        return current.map((item) =>
          item.serviceId === serviceId && item.layerName === layerName
            ? { ...item, visible: !item.visible }
            : item
        );
      }
      return [...current, { serviceId, serviceKind, layerName, visible: true }];
    });
  }

  async function runAnalysis() {
    setIsAnalysing(true);
    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: analysisPrompt,
          areaGeojson: analysisArea ?? undefined,
          inactivityYears: filters.historicalInactivityYears
        })
      });
      if (!response.ok) throw new Error("Analysis failed");
      const json = (await response.json()) as AnalysisResponse;
      setAnalysis(json);
    } finally {
      setIsAnalysing(false);
    }
  }

  function saveBookmark() {
    const id = crypto.randomUUID();
    const payload = {
      id,
      createdAt: new Date().toISOString(),
      filters,
      activeLayers,
      analysis
    };
    localStorage.setItem(`aussieprospect:${id}`, JSON.stringify(payload));
    const url = `${window.location.origin}?bookmark=${id}`;
    setShareUrl(url);
    window.history.replaceState({}, "", url);
  }

  return (
    <main className="min-h-screen p-4 md:p-6">
      <div className="mx-auto grid max-w-[1800px] gap-4 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Panel className="scrollbar-thin flex max-h-[calc(100vh-2rem)] flex-col gap-4 overflow-y-auto md:max-h-[calc(100vh-3rem)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge>AussieProspect AI</Badge>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">
                Australian gold, precious metal and gem prospecting intelligence
              </h1>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                Live government geoscience layers, AI-assisted research, shareable maps and export tools for amateur prospectors and fossickers.
              </p>
            </div>
            <button
              className="rounded-2xl border border-[color:var(--border)] p-3"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              type="button"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>

          <Panel className="bg-[color:var(--panel-strong)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              <Search size={16} />
              How To Use
            </div>
            <ol className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--muted)]">
              <li>1. Load official WFS/WMS layers from the layer manager.</li>
              <li>2. Draw a search area or zoom to your target district.</li>
              <li>3. Filter for commodities, historical activity and tenement status.</li>
              <li>4. Ask the AI assistant for top candidate spots, then inspect the new overlay on the map.</li>
            </ol>
          </Panel>

          <Panel className="bg-[color:var(--panel-strong)]">
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              <Sparkles size={16} />
              Prospecting Assistant
            </div>
            <textarea
              className="mt-3 min-h-28 w-full rounded-2xl border border-[color:var(--border)] bg-transparent p-3 text-sm outline-none"
              value={analysisPrompt}
              onChange={(event) => setAnalysisPrompt(event.target.value)}
            />
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <label className="space-y-2">
                <span className="text-[color:var(--muted)]">Commodity</span>
                <select
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-transparent p-2"
                  value={filters.commodity}
                  onChange={(event) =>
                    setFilters((current) => ({ ...current, commodity: event.target.value as AppFilters["commodity"] }))
                  }
                >
                  {["gold", "silver", "platinum", "opal", "sapphire", "ruby", "emerald", "diamond", "gems", "all"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-[color:var(--muted)]">Tenement</span>
                <select
                  className="w-full rounded-2xl border border-[color:var(--border)] bg-transparent p-2"
                  value={filters.tenementStatus}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      tenementStatus: event.target.value as AppFilters["tenementStatus"]
                    }))
                  }
                >
                  {["all", "active", "expired", "pending"].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="mt-3 block text-sm">
              <span className="text-[color:var(--muted)]">
                Historical inactivity threshold: {filters.historicalInactivityYears} years
              </span>
              <input
                className="mt-2 w-full"
                type="range"
                min={20}
                max={80}
                step={5}
                value={filters.historicalInactivityYears}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    historicalInactivityYears: Number(event.target.value)
                  }))
                }
              />
            </label>
            <button
              className="mt-4 w-full rounded-2xl bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
              onClick={runAnalysis}
              type="button"
              disabled={isAnalysing}
            >
              {isAnalysing ? "Analysing..." : "Analyse Selected Area"}
            </button>
          </Panel>

          <Panel>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              National Summary
            </div>
            <p className="mt-2 text-sm text-[color:var(--muted)]">
              {onlineSources.length} service endpoints online, {Object.values(capabilities).reduce((acc, service) => acc + service.layers.length, 0)} discoverable layers, {selectedFeatureCount} visible features in the current working set.
            </p>
          </Panel>

          <Panel>
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              Official Sources
            </div>
            <div className="mt-3 space-y-3">
              {catalog.map((service) => (
                <div key={service.id} className="rounded-2xl border border-[color:var(--border)] p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold">{service.name}</div>
                      <div className="text-xs uppercase tracking-[0.16em] text-[color:var(--muted)]">
                        {service.jurisdiction} · {service.kind}
                      </div>
                    </div>
                    <button
                      className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs"
                      onClick={() => loadCapabilities(service.id)}
                      type="button"
                    >
                      Discover
                    </button>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{service.description}</p>
                  {capabilities[service.id] ? (
                    <LayerPicker
                      serviceId={service.id}
                      serviceKind={service.kind}
                      activeLayers={activeLayers}
                      layers={capabilities[service.id].layers}
                      onToggle={toggleLayer}
                    />
                  ) : (
                    <p className="mt-3 text-xs text-[color:var(--muted)]">
                      Pulls live GetCapabilities metadata from the official endpoint or fallback candidates.
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="bg-[color:var(--panel-strong)]">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
              Legal And Data Notes
            </div>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--muted)]">
              <li>Fossicking permits, landholder permission and mining or access approvals may be required.</li>
              <li>Always verify current tenements, land access, environmental restrictions and heritage protections before travel.</li>
              <li>Government geoscience layers are displayed for informational use only and remain subject to each source agency’s licence and attribution terms.</li>
            </ul>
          </Panel>

          {analysis ? (
            <Panel className="bg-[color:var(--panel-strong)]">
              <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                AI Results
              </div>
              <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">{analysis.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
                  onClick={() => exportGeoJson("aussieprospect-analysis.geojson", analysis.mapOverlay)}
                  type="button"
                >
                  Export GeoJSON
                </button>
                <button
                  className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
                  onClick={() => exportKml("aussieprospect-analysis.kml", analysis.mapOverlay)}
                  type="button"
                >
                  Export KML
                </button>
                <button
                  className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
                  onClick={() => exportPdfReport("aussieprospect-report.pdf", analysis)}
                  type="button"
                >
                  Export PDF
                </button>
                <button
                  className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
                  onClick={saveBookmark}
                  type="button"
                >
                  <Share2 className="mr-1 inline-block" size={14} />
                  Save / Share View
                </button>
              </div>
              {shareUrl ? (
                <p className="mt-3 break-all text-xs text-[color:var(--muted)]">{shareUrl}</p>
              ) : null}
              <div className="mt-4 space-y-3">
                {analysis.candidates.map((candidate) => (
                  <div key={candidate.id} className="rounded-2xl border border-[color:var(--border)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-semibold">{candidate.name}</div>
                      <Badge>{Math.round(candidate.confidence * 100)}% confidence</Badge>
                    </div>
                    <p className="mt-2 text-sm text-[color:var(--muted)]">{candidate.reasoning.join(" ")}</p>
                  </div>
                ))}
              </div>
            </Panel>
          ) : null}
        </Panel>

        <div className="min-h-[70vh] overflow-hidden rounded-[2rem] border border-[color:var(--border)] shadow-[0_20px_70px_rgba(0,0,0,0.18)]">
          <ProspectMap
            activeLayers={activeLayers}
            analysisOverlay={analysis?.mapOverlay ?? null}
            filters={filters}
            onAreaChange={setAnalysisArea}
            onFeatureCountChange={setSelectedFeatureCount}
          />
        </div>
      </div>
    </main>
  );
}

function LayerPicker({
  serviceId,
  serviceKind,
  layers,
  activeLayers,
  onToggle
}: {
  serviceId: string;
  serviceKind: "WFS" | "WMS";
  layers: LayerSummary[];
  activeLayers: ActiveLayerSelection[];
  onToggle: (serviceId: string, serviceKind: "WFS" | "WMS", layerName: string) => void;
}) {
  const important = layers
    .filter((layer) => /(mine|occurrence|deposit|tenement|resource|opal|gold|gem)/i.test(layer.name + layer.title))
    .slice(0, 12);

  return (
    <div className="mt-3 space-y-2">
      {important.length ? (
        important.map((layer) => {
          const active = activeLayers.some(
            (item) => item.serviceId === serviceId && item.layerName === layer.name && item.visible
          );
          return (
            <button
              key={layer.name}
              className="flex w-full items-start justify-between rounded-2xl border border-[color:var(--border)] px-3 py-2 text-left text-sm"
              onClick={() => onToggle(serviceId, serviceKind, layer.name)}
              type="button"
            >
              <span>
                <span className="block font-medium">{layer.title}</span>
                <span className="block text-xs text-[color:var(--muted)]">{layer.name}</span>
              </span>
              <span className="text-xs">{active ? "On" : "Off"}</span>
            </button>
          );
        })
      ) : (
        <div className="text-xs text-[color:var(--muted)]">
          No matching prospecting layers were auto-identified yet for this service.
        </div>
      )}
    </div>
  );
}
