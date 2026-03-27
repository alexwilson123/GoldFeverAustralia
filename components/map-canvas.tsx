"use client";

import { useEffect, useMemo, useState } from "react";
import type { Feature, FeatureCollection } from "geojson";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import {
  FeatureGroup,
  GeoJSON,
  LayersControl,
  MapContainer,
  ScaleControl,
  TileLayer,
  WMSTileLayer
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import type { ActiveLayerSelection, AppFilters } from "@/lib/types";

const australiaCenter: LatLngExpression = [-25.2744, 133.7751];

export function MapCanvas({
  activeLayers,
  analysisOverlay,
  filters,
  onAreaChange,
  onFeatureCountChange,
  onFeatureSelect
}: {
  activeLayers: ActiveLayerSelection[];
  analysisOverlay: FeatureCollection | null;
  filters: AppFilters;
  onAreaChange: (value: FeatureCollection | null) => void;
  onFeatureCountChange: (count: number) => void;
  onFeatureSelect: (feature: { properties: Record<string, unknown>; ai: boolean } | null) => void;
}) {
  const [featureCollections, setFeatureCollections] = useState<Record<string, FeatureCollection>>({});

  const activeWfsLayers = useMemo(
    () => activeLayers.filter((layer) => layer.visible && layer.serviceKind === "WFS"),
    [activeLayers]
  );
  const activeWmsLayers = useMemo(
    () => activeLayers.filter((layer) => layer.visible && layer.serviceKind === "WMS"),
    [activeLayers]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadFeatures() {
      const entries = await Promise.all(
        activeWfsLayers.map(async (layer) => {
          const params = new URLSearchParams({
            serviceId: layer.serviceId,
            layerName: layer.layerName,
            commodity: filters.commodity,
            timePeriod: filters.timePeriod,
            tenementStatus: filters.tenementStatus,
            historicalInactivityYears: String(filters.historicalInactivityYears),
            count: "120"
          });
          const response = await fetch(`/api/features?${params.toString()}`);
          if (!response.ok) return [keyForLayer(layer.serviceId, layer.layerName), null] as const;
          return [keyForLayer(layer.serviceId, layer.layerName), (await response.json()) as FeatureCollection] as const;
        })
      );

      if (cancelled) return;

      const next = Object.fromEntries(entries.filter((item) => item[1])) as Record<string, FeatureCollection>;
      setFeatureCollections(next);
      onFeatureCountChange(
        Object.values(next).reduce((acc, collection) => acc + (collection.features?.length ?? 0), 0)
      );
    }

    void loadFeatures();

    return () => {
      cancelled = true;
    };
  }, [activeWfsLayers, filters, onFeatureCountChange]);

  return (
    <MapContainer center={australiaCenter} zoom={5} scrollWheelZoom className="h-full min-h-[70vh]">
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name="OpenStreetMap">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name="Satellite">
          <TileLayer
            attribution='Tiles &copy; Esri'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          />
        </LayersControl.BaseLayer>

        {activeWmsLayers.map((layer) => {
          return (
            <LayersControl.Overlay
              key={keyForLayer(layer.serviceId, layer.layerName)}
              checked
              name={`${layer.serviceId} ${layer.layerName}`}
            >
              <WMSTileLayer
                url={`/api/wms?serviceId=${layer.serviceId}`}
                layers={layer.layerName}
                format="image/png"
                transparent
                attribution="Official government data service"
              />
            </LayersControl.Overlay>
          );
        })}
      </LayersControl>

      <FeatureGroup>
        <EditControl
          position="topleft"
          onCreated={(event) => {
            const layer = event.layer as L.Layer & { toGeoJSON: () => FeatureCollection | Feature };
            const created = layer.toGeoJSON();
            const collection =
              "features" in created
                ? created
                : {
                    type: "FeatureCollection" as const,
                    features: [created]
                  };
            onAreaChange(collection);
          }}
          onDeleted={() => onAreaChange(null)}
          draw={{
            rectangle: true,
            polygon: true,
            polyline: false,
            marker: false,
            circlemarker: false,
            circle: true
          }}
        />
      </FeatureGroup>

      {Object.entries(featureCollections).map(([key, collection]) => (
        <GeoJSON
          key={key}
          data={collection}
          style={() => ({
            color: "#dcb35b",
            weight: 2,
            fillOpacity: 0.18
          })}
          pointToLayer={(feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 8,
              fillColor: "#f2b84b",
              color: "#432d11",
              weight: 2,
              fillOpacity: 0.92
            })
              .bindPopup(renderPopup(feature.properties ?? {}))
              .bindTooltip("Click for details", {
                direction: "top",
                offset: [0, -8],
                opacity: 0.9
              })
          }
          onEachFeature={(feature, layer) => {
            layer.on("click", () => {
              onFeatureSelect({ properties: (feature.properties ?? {}) as Record<string, unknown>, ai: false });
            });
            if (feature.geometry.type !== "Point") {
              layer.bindPopup(renderPopup(feature.properties ?? {}));
            }
          }}
        />
      ))}

      {analysisOverlay ? (
        <GeoJSON
          data={analysisOverlay}
          pointToLayer={(feature, latlng) =>
            L.circleMarker(latlng, {
              radius: 10,
              fillColor: "#43d1a5",
              color: "#082f2d",
              weight: 2,
              fillOpacity: 0.88
            })
              .bindPopup(renderPopup(feature.properties ?? {}, true))
              .on("click", () => {
                onFeatureSelect({ properties: (feature.properties ?? {}) as Record<string, unknown>, ai: true });
              })
          }
        />
      ) : null}

      <ScaleControl />
    </MapContainer>
  );
}

function keyForLayer(serviceId: string, layerName: string) {
  return `${serviceId}:${layerName}`;
}

function renderPopup(properties: Record<string, unknown>, ai = false) {
  const headline = String(properties.name ?? properties.title ?? properties.identifier ?? "Feature");
  const commodity = String(properties.commodity ?? properties["Commodity"] ?? "Unknown commodity");
  const status = String(properties.status ?? properties.tenementType ?? "Status unavailable");
  const source = friendlySource(String(properties["@layerName"] ?? properties["@featureType"] ?? "Map layer"));
  const details = buildDetailRows(properties);
  const note = ai
    ? `<p style="margin:8px 0 0"><strong>Why it stood out:</strong> ${String(properties.reasoning ?? "")}</p>`
    : `<p style="margin:8px 0 0"><strong>What this is:</strong> ${friendlyStatus(status)}</p>`;
  const risks = ai ? `<p style="margin:8px 0 0"><strong>Things to check:</strong> ${String(properties.risks ?? "")}</p>` : "";

  return `
    <div style="min-width:280px; max-width:320px">
      <strong style="font-size:16px">${headline}</strong>
      <p><strong>Main clue:</strong> ${commodity}</p>
      <p><strong>Map layer:</strong> ${source}</p>
      ${note}
      ${details}
      ${risks}
      ${properties.identifier ? `<p style="margin:8px 0 0"><a href="${String(properties.identifier)}" target="_blank" rel="noreferrer">Open original government record</a></p>` : ""}
    </div>
  `;
}

function buildDetailRows(properties: Record<string, unknown>) {
  const fields = [
    { label: "Status", keys: ["status", "tenementType"] },
    { label: "Owner", keys: ["owner"] },
    { label: "Area", keys: ["area"] },
    { label: "Grant date", keys: ["grantDate"] },
    { label: "Expiry", keys: ["expireDate"] },
    { label: "Observation", keys: ["observationMethod"] },
    { label: "Accuracy", keys: ["positionalAccuracy"] }
  ];

  const rows = fields
    .map(({ label, keys }) => {
      const value = keys
        .map((key) => properties[key])
        .find((item) => item !== undefined && item !== null && String(item).trim() !== "");

      if (!value) return "";
      return `<p style="margin:6px 0 0"><strong>${label}:</strong> ${String(value)}</p>`;
    })
    .filter(Boolean)
    .join("");

  return rows ? `<div style="margin-top:10px">${rows}</div>` : "";
}

function friendlySource(value: string) {
  return value
    .replace(/erl:/gi, "")
    .replace(/ama:/gi, "")
    .replace(/mt:/gi, "")
    .replace(/mo:/gi, "")
    .replace(/MineView/gi, "Old mines")
    .replace(/MineralOccurrenceView/gi, "Mineral finds")
    .replace(/MineralTenement/gi, "Tenements")
    .replace(/MinOccView/gi, "Mineral finds")
    .trim();
}

function friendlyStatus(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("closed") || lower.includes("expired")) return "Older or inactive ground";
  if (lower.includes("active") || lower.includes("granted")) return "Currently active or held ground";
  if (lower.includes("pending")) return "Application or pending ground";
  return value;
}
