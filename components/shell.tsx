"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import {
  Compass,
  Info,
  Moon,
  Search,
  Share2,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  Zap
} from "lucide-react";
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

const aiEnabled =
  process.env.NEXT_PUBLIC_ENABLE_AI_ASSISTANT === "true" ||
  process.env.NODE_ENV === "development";

export function Shell({ initialCatalog }: { initialCatalog: DataService[] }) {
  const { setTheme, resolvedTheme } = useTheme();
  const [catalog] = useState(initialCatalog);
  const [capabilities, setCapabilities] = useState<Record<string, ServiceCapabilities>>({});
  const [activeLayers, setActiveLayers] = useState<ActiveLayerSelection[]>([
    { serviceId: "ga-wms", serviceKind: "WMS", layerName: "erl:MineView", visible: true },
    { serviceId: "ga-wfs", serviceKind: "WFS", layerName: "erl:MineView", visible: true }
  ]);
  const [filters, setFilters] = useState(defaultFilters);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisPrompt, setAnalysisPrompt] = useState(
    "Show me promising gold areas near old mines with little recent activity."
  );
  const [analysisArea, setAnalysisArea] = useState<FeatureCollection | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [selectedFeatureCount, setSelectedFeatureCount] = useState(0);
  const [selectedFeature, setSelectedFeature] = useState<{
    properties: Record<string, unknown>;
    ai: boolean;
  } | null>(null);
  const [isAnalysing, setIsAnalysing] = useState(false);

  const loadedSources = useMemo(
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
      <div className="mx-auto max-w-[1760px] space-y-4">
        <Panel className="hero-card overflow-hidden bg-[color:var(--panel-strong)] p-0">
          <div className="grid gap-6 px-5 py-6 md:px-8 md:py-8 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <Badge>Find better places to explore</Badge>
              <div className="space-y-3">
                <h1 className="max-w-3xl text-4xl font-semibold leading-tight md:text-5xl">
                  A cleaner, easier way to explore old Australian gold and gem country
                </h1>
                <p className="max-w-2xl text-base leading-7 text-[color:var(--muted)] md:text-lg">
                  Browse old mines, mineral finds and tenement clues on one map, then get simple prospecting suggestions without needing to understand technical GIS jargon.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                  onClick={runAnalysis}
                  type="button"
                  disabled={isAnalysing}
                >
                  {isAnalysing ? "Scanning area..." : "Find Good Spots"}
                </button>
                <button
                  className="rounded-full border border-[color:var(--border)] px-5 py-3 text-sm font-semibold"
                  onClick={saveBookmark}
                  type="button"
                >
                  Save This View
                </button>
                <button
                  className="rounded-full border border-[color:var(--border)] px-4 py-3"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  type="button"
                  aria-label="Toggle theme"
                >
                  {resolvedTheme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <QuickStat icon={<Compass size={16} />} label="Map layers ready" value={`${loadedSources.length}`} />
                <QuickStat icon={<Star size={16} />} label="Visible places" value={`${selectedFeatureCount}`} />
                <QuickStat icon={<Zap size={16} />} label="Results mode" value={aiEnabled ? "AI + smart scan" : "Smart scan"} />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-1">
              <InfoCard
                title="How it works"
                text="Turn on useful layers, draw an area, then let the app highlight old workings and quieter ground nearby."
              />
              <InfoCard
                title="Best for beginners"
                text="The app hides most technical service details and focuses on plain-English guidance, map clues and safer next steps."
              />
              <InfoCard
                title="Always double-check access"
                text="Permits, landowner permission, current tenements and environmental rules still matter before you go."
                icon={<ShieldAlert size={16} />}
              />
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
          <div className="scrollbar-thin flex max-h-[calc(100vh-15rem)] flex-col gap-4 overflow-y-auto">
            <Panel className="bg-[color:var(--panel-strong)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                <Sparkles size={16} />
                Prospect Helper
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                Ask in plain English, like “show me old gold areas near Bendigo” or “find opal country with old activity”.
              </p>
              <textarea
                className="mt-3 min-h-28 w-full rounded-3xl border border-[color:var(--border)] bg-transparent p-4 text-sm outline-none"
                value={analysisPrompt}
                onChange={(event) => setAnalysisPrompt(event.target.value)}
              />
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <SimpleSelect
                  label="Looking for"
                  value={filters.commodity}
                  options={["gold", "silver", "platinum", "opal", "sapphire", "ruby", "emerald", "diamond", "gems", "all"]}
                  onChange={(value) =>
                    setFilters((current) => ({ ...current, commodity: value as AppFilters["commodity"] }))
                  }
                />
                <SimpleSelect
                  label="Tenement view"
                  value={filters.tenementStatus}
                  options={["all", "active", "expired", "pending"]}
                  onChange={(value) =>
                    setFilters((current) => ({
                      ...current,
                      tenementStatus: value as AppFilters["tenementStatus"]
                    }))
                  }
                />
              </div>
              <label className="mt-4 block text-sm">
                <span className="text-[color:var(--muted)]">
                  Prefer older ground: {filters.historicalInactivityYears}+ years since known activity
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
                className="mt-4 w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-black transition hover:opacity-90"
                onClick={runAnalysis}
                type="button"
                disabled={isAnalysing}
              >
                {isAnalysing ? "Searching map..." : "Scan This Area"}
              </button>
            </Panel>

            <Panel>
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                <Search size={16} />
                Useful Map Layers
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                Pick a few simple overlays. You do not need every data layer turned on at once.
              </p>
              <div className="mt-3 space-y-3">
                {catalog.map((service) => (
                  <div key={service.id} className="rounded-3xl border border-[color:var(--border)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold">{friendlyServiceName(service.name)}</div>
                        <div className="text-xs text-[color:var(--muted)]">{friendlyServiceHint(service.jurisdiction)}</div>
                      </div>
                      <button
                        className="rounded-full border border-[color:var(--border)] px-3 py-1 text-xs"
                        onClick={() => loadCapabilities(service.id)}
                        type="button"
                      >
                        Load
                      </button>
                    </div>
                    {capabilities[service.id] ? (
                      <LayerPicker
                        serviceId={service.id}
                        serviceKind={service.kind}
                        layers={capabilities[service.id].layers}
                        activeLayers={activeLayers}
                        onToggle={toggleLayer}
                      />
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-[color:var(--muted)]">
                        Loads live layers from the official {service.jurisdiction} source.
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Panel>

            {analysis ? (
              <Panel className="bg-[color:var(--panel-strong)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                      Suggested Areas
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{analysis.summary}</p>
                  </div>
                  <Badge>{analysis.candidates.length} picks</Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ActionChip label="GeoJSON" onClick={() => exportGeoJson("aussieprospect-analysis.geojson", analysis.mapOverlay)} />
                  <ActionChip label="KML" onClick={() => exportKml("aussieprospect-analysis.kml", analysis.mapOverlay)} />
                  <ActionChip label="PDF" onClick={() => exportPdfReport("aussieprospect-report.pdf", analysis)} />
                  <ActionChip label="Share" onClick={saveBookmark} icon={<Share2 size={14} />} />
                </div>
                {shareUrl ? <p className="mt-3 break-all text-xs text-[color:var(--muted)]">{shareUrl}</p> : null}
                <div className="mt-4 space-y-3">
                  {analysis.candidates.map((candidate, index) => (
                    <div key={candidate.id} className="rounded-3xl border border-[color:var(--border)] p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
                            Pick {index + 1}
                          </div>
                          <div className="mt-1 text-lg font-semibold">{candidate.name}</div>
                        </div>
                        <Badge>{Math.round(candidate.confidence * 100)}% match</Badge>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                        {candidate.reasoning[0]}
                      </p>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : (
              <Panel>
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                  Quick Start
                </div>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-[color:var(--muted)]">
                  <li>Draw a shape on the map around the district you want to explore.</li>
                  <li>Turn on old mines and mineral occurrence layers first.</li>
                  <li>Use the scan button to highlight promising areas directly on the map.</li>
                </ul>
              </Panel>
            )}

            <Panel className="bg-[color:var(--panel-strong)]">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[color:var(--accent)]">
                <Info size={16} />
                Selected Place
              </div>
              {selectedFeature ? (
                <SelectedFeatureCard
                  properties={selectedFeature.properties}
                  ai={selectedFeature.ai}
                />
              ) : (
                <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
                  Click a marker on the map to see more details here, including status, owner, dates and the original government record link.
                </p>
              )}
            </Panel>
          </div>

          <div className="overflow-hidden rounded-[32px] border border-[color:var(--border)] shadow-[0_20px_70px_rgba(0,0,0,0.16)]">
            <ProspectMap
              activeLayers={activeLayers}
              analysisOverlay={analysis?.mapOverlay ?? null}
              filters={filters}
              onAreaChange={setAnalysisArea}
              onFeatureCountChange={setSelectedFeatureCount}
              onFeatureSelect={setSelectedFeature}
            />
          </div>
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
    .slice(0, 8);

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
              className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left text-sm transition ${
                active
                  ? "border-transparent bg-[color:var(--accent-soft)]"
                  : "border-[color:var(--border)]"
              }`}
              onClick={() => onToggle(serviceId, serviceKind, layer.name)}
              type="button"
            >
              <span>
                <span className="block font-medium">{friendlyLayerTitle(layer.title)}</span>
                <span className="block text-xs text-[color:var(--muted)]">{active ? "Showing on map" : "Tap to show"}</span>
              </span>
              <span className="text-xs font-semibold">{active ? "On" : "Off"}</span>
            </button>
          );
        })
      ) : (
        <div className="text-xs text-[color:var(--muted)]">
          No beginner-friendly layers were found automatically for this source yet.
        </div>
      )}
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
      <div className="flex items-center gap-2 text-[color:var(--accent)]">{icon}</div>
      <div className="mt-3 text-2xl font-semibold">{value}</div>
      <div className="text-sm text-[color:var(--muted)]">{label}</div>
    </div>
  );
}

function InfoCard({
  title,
  text,
  icon
}: {
  title: string;
  text: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--panel)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{text}</p>
    </div>
  );
}

function SimpleSelect({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-[color:var(--muted)]">{label}</span>
      <select
        className="w-full rounded-2xl border border-[color:var(--border)] bg-transparent p-3"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ActionChip({
  label,
  onClick,
  icon
}: {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
      onClick={onClick}
      type="button"
    >
      {icon ? <span className="mr-1 inline-block">{icon}</span> : null}
      {label}
    </button>
  );
}

function SelectedFeatureCard({
  properties,
  ai
}: {
  properties: Record<string, unknown>;
  ai: boolean;
}) {
  const headline = String(properties.name ?? properties.title ?? properties.identifier ?? "Selected place");
  const commodity = String(properties.commodity ?? properties["Commodity"] ?? "Unknown");
  const source = friendlyLayerTitle(
    String(properties["@layerName"] ?? properties["@featureType"] ?? "Map layer")
  );
  const rows = [
    { label: "Status", value: properties.status ?? properties.tenementType },
    { label: "Owner", value: properties.owner },
    { label: "Area", value: properties.area },
    { label: "Grant date", value: properties.grantDate },
    { label: "Expiry date", value: properties.expireDate },
    { label: "Observation", value: properties.observationMethod },
    { label: "Accuracy", value: properties.positionalAccuracy }
  ].filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== "");

  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">
          {ai ? "Suggested area" : "Map location"}
        </div>
        <div className="mt-1 text-xl font-semibold">{headline}</div>
      </div>
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Main clue</div>
        <div className="mt-1 font-medium">{commodity}</div>
      </div>
      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3">
        <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Layer</div>
        <div className="mt-1 font-medium">{source}</div>
      </div>
      {ai && properties.reasoning ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3 text-sm leading-6 text-[color:var(--muted)]">
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Why it stood out</div>
          <div className="mt-1">{String(properties.reasoning)}</div>
        </div>
      ) : null}
      {rows.length ? (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--panel)] p-3">
          <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted)]">Details</div>
          <div className="mt-2 space-y-2 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4">
                <span className="text-[color:var(--muted)]">{row.label}</span>
                <span className="max-w-[55%] text-right font-medium">{String(row.value)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {properties.identifier ? (
        <a
          className="inline-flex rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold"
          href={String(properties.identifier)}
          target="_blank"
          rel="noreferrer"
        >
          Open original government record
        </a>
      ) : null}
    </div>
  );
}

function friendlyServiceName(name: string) {
  return name
    .replace("EarthResource", "Australian Resources")
    .replace("WFS", "")
    .replace("WMS", "")
    .trim();
}

function friendlyServiceHint(jurisdiction: string) {
  return jurisdiction === "National" ? "Australia-wide data" : `${jurisdiction} government data`;
}

function friendlyLayerTitle(title: string) {
  return title
    .replace(/Mineral Occurrence/gi, "Mineral finds")
    .replace(/Mineral Tenement/gi, "Tenements")
    .replace(/MineView/gi, "Old mines")
    .replace(/View/gi, "")
    .trim();
}
