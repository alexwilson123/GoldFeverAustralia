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
  onFeatureCountChange
}: {
  activeLayers: ActiveLayerSelection[];
  analysisOverlay: FeatureCollection | null;
  filters: AppFilters;
  onAreaChange: (value: FeatureCollection | null) => void;
  onFeatureCountChange: (count: number) => void;
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
            count: "250"
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
              radius: 6,
              fillColor: "#f2b84b",
              color: "#432d11",
              weight: 1,
              fillOpacity: 0.9
            }).bindPopup(renderPopup(feature.properties ?? {}))
          }
          onEachFeature={(feature, layer) => {
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
            }).bindPopup(renderPopup(feature.properties ?? {}, true))
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
  const source = String(properties["@layerName"] ?? properties["@featureType"] ?? "Source layer");
  const reasoning = ai ? `<p><strong>Reasoning:</strong> ${String(properties.reasoning ?? "")}</p>` : "";
  const risks = ai ? `<p><strong>Risks:</strong> ${String(properties.risks ?? "")}</p>` : "";

  return `
    <div style="min-width:240px">
      <strong>${headline}</strong>
      <p><strong>Commodity:</strong> ${commodity}</p>
      <p><strong>Status:</strong> ${status}</p>
      <p><strong>Layer:</strong> ${source}</p>
      ${reasoning}
      ${risks}
      ${properties.identifier ? `<p><a href="${String(properties.identifier)}" target="_blank" rel="noreferrer">Original record</a></p>` : ""}
    </div>
  `;
}
