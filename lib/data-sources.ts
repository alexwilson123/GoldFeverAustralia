import type { DataService } from "@/lib/types";

const services: DataService[] = [
  {
    id: "ga-wfs",
    name: "Geoscience Australia EarthResource WFS",
    jurisdiction: "National",
    kind: "WFS",
    description:
      "National mineral occurrences, mines, deposits, reserves/resources, processing plants and related EarthResourceML views.",
    sourceUrl: "https://www.ga.gov.au/scientific-topics/disciplines/minerals",
    documentationUrl: "https://services.ga.gov.au/gis/earthresource/wfs?service=WFS&request=GetCapabilities",
    capabilitiesCandidates: ["https://services.ga.gov.au/gis/earthresource/wfs"],
    defaultLayerHints: [
      "erl:MineView",
      "erl:MineralOccurrenceView",
      "ama:MineralOccurrences",
      "ama:MineralDeposits",
      "ama:ReservesAndResources"
    ],
    tags: ["gold", "silver", "precious metals", "gems", "historical mines"],
    licence: "Geoscience Australia open web services; check source metadata for dataset-specific terms."
  },
  {
    id: "ga-wms",
    name: "Geoscience Australia EarthResource WMS",
    jurisdiction: "National",
    kind: "WMS",
    description:
      "National discoverable map layers for EarthResource and Australian Mines Atlas datasets.",
    sourceUrl: "https://www.ga.gov.au/scientific-topics/disciplines/minerals",
    documentationUrl: "https://services.ga.gov.au/gis/earthresource/wms?service=WMS&request=GetCapabilities",
    capabilitiesCandidates: ["https://services.ga.gov.au/gis/earthresource/wms"],
    defaultLayerHints: ["erl:MineView", "ama:MineralOccurrences", "ama:MineWaste"],
    tags: ["wms", "mines atlas"],
    licence: "Geoscience Australia open web services; check source metadata for dataset-specific terms."
  },
  {
    id: "nsw-wfs",
    name: "NSW GeoScience WFS",
    jurisdiction: "NSW",
    kind: "WFS",
    description:
      "NSW mineral tenements, mineral occurrences, mines and related exploration datasets published through GeoServer.",
    sourceUrl: "https://www.resources.nsw.gov.au/geological-survey",
    documentationUrl: "https://gs.geoscience.nsw.gov.au/geoserver/wfs?service=WFS&request=GetCapabilities",
    capabilitiesCandidates: ["https://gs.geoscience.nsw.gov.au/geoserver/wfs"],
    defaultLayerHints: ["mt:MineralTenement", "mo:MinOccView", "erl:MineView", "erl:MineralOccurrenceView"],
    tags: ["tenements", "expired leases", "mineral occurrences"],
    licence: "NSW Government spatial web services; verify source-layer licence and access terms before reuse."
  },
  {
    id: "nsw-wms",
    name: "NSW GeoScience WMS",
    jurisdiction: "NSW",
    kind: "WMS",
    description:
      "Discoverable NSW geology and resource layers including mines and tenements.",
    sourceUrl: "https://www.resources.nsw.gov.au/geological-survey",
    documentationUrl: "https://gs.geoscience.nsw.gov.au/geoserver/wms?service=WMS&request=GetCapabilities",
    capabilitiesCandidates: ["https://gs.geoscience.nsw.gov.au/geoserver/wms"],
    defaultLayerHints: ["mt:MineralTenement", "mo:MinOccView", "erl:MineView"],
    tags: ["wms", "nsw geology"],
    licence: "NSW Government spatial web services; verify source-layer licence and access terms before reuse."
  },
  {
    id: "qld-wfs",
    name: "Queensland Geology WFS",
    jurisdiction: "QLD",
    kind: "WFS",
    description:
      "Queensland geological and resource web features exposed through the official GeoServer OWS endpoint.",
    sourceUrl: "https://geology.information.qld.gov.au",
    documentationUrl: "https://geology.information.qld.gov.au/geoserver/ows?service=WFS&request=GetCapabilities",
    capabilitiesCandidates: ["https://geology.information.qld.gov.au/geoserver/ows"],
    defaultLayerHints: ["erl:MineView", "erl:MineralOccurrenceView", "gsmlp:BoreholeView"],
    tags: ["qld", "mines", "occurrences", "historical workings"],
    licence: "Queensland Government geoscience services; confirm dataset metadata for current licence conditions."
  },
  {
    id: "qld-wms",
    name: "Queensland Geology WMS",
    jurisdiction: "QLD",
    kind: "WMS",
    description:
      "Queensland geology WMS endpoint for discoverable map layers and overlays.",
    sourceUrl: "https://geology.information.qld.gov.au",
    documentationUrl: "https://geology.information.qld.gov.au/geoserver/ows?service=WMS&request=GetCapabilities",
    capabilitiesCandidates: ["https://geology.information.qld.gov.au/geoserver/ows"],
    defaultLayerHints: ["erl:MineView", "erl:MineralOccurrenceView"],
    tags: ["wms", "qld geology"],
    licence: "Queensland Government geoscience services; confirm dataset metadata for current licence conditions."
  },
  {
    id: "vic-wms",
    name: "Victoria Geology Portal",
    jurisdiction: "VIC",
    kind: "WMS",
    description:
      "Victorian geology portal placeholder entry. Supply a confirmed WMSServer endpoint if the public service path changes.",
    sourceUrl: "https://geology.data.vic.gov.au",
    documentationUrl: "https://geology.data.vic.gov.au",
    capabilitiesCandidates: [
      "https://geology.data.vic.gov.au/geoserver/ows",
      "https://services.geoscience.vic.gov.au/arcgis/services/GeoVic/MapServer/WMSServer"
    ],
    defaultLayerHints: [],
    tags: ["victoria", "manual verification may be required"],
    licence: "Victorian Government open data terms as published by the source portal."
  },
  {
    id: "wa-wms",
    name: "WA GeoVIEW",
    jurisdiction: "WA",
    kind: "WMS",
    description:
      "WA Department of Mines, Petroleum and Exploration geospatial services. Endpoint discovery can vary by deployment path.",
    sourceUrl: "https://geossdi.dmp.wa.gov.au",
    documentationUrl: "https://geossdi.dmp.wa.gov.au",
    capabilitiesCandidates: [
      "https://geossdi.dmp.wa.gov.au/arcgis/services/GeoVIEW/MapServer/WMSServer",
      "https://geossdi.dmp.wa.gov.au/arcgis/services/EXTERNAL/GeoVIEW/MapServer/WMSServer"
    ],
    defaultLayerHints: [],
    tags: ["wa", "tenements", "historical mines"],
    licence: "WA Government geospatial services; confirm dataset-level licence and attribution terms."
  },
  {
    id: "sa-wms",
    name: "South Australia SARIG",
    jurisdiction: "SA",
    kind: "WMS",
    description:
      "South Australian Resources Information Gateway map service entry with endpoint fallbacks.",
    sourceUrl: "https://map.sarig.sa.gov.au",
    documentationUrl: "https://sarigdata.pir.sa.gov.au",
    capabilitiesCandidates: [
      "https://sarigdata.pir.sa.gov.au/arcgis/services/SARIG/MapServer/WMSServer",
      "https://sarigdata.pir.sa.gov.au/arcgis/services/SARIG_Public/MapServer/WMSServer"
    ],
    defaultLayerHints: [],
    tags: ["sa", "sarig"],
    licence: "South Australian Government open spatial services; confirm dataset metadata before redistribution."
  },
  {
    id: "tas-wms",
    name: "Tasmanian LISTdata",
    jurisdiction: "TAS",
    kind: "WMS",
    description:
      "Tasmanian LISTdata entry for geology/mineral exploration overlays.",
    sourceUrl: "https://www.thelist.tas.gov.au",
    documentationUrl: "https://listdata.thelist.tas.gov.au",
    capabilitiesCandidates: [
      "https://listdata.thelist.tas.gov.au/arcgis/services/Public/GeoscientificInformation/MapServer/WMSServer"
    ],
    defaultLayerHints: [],
    tags: ["tas", "thelist"],
    licence: "Tasmanian Government spatial data terms as published by the source portal."
  },
  {
    id: "nt-wms",
    name: "Northern Territory Geology Data",
    jurisdiction: "NT",
    kind: "WMS",
    description:
      "Northern Territory geology data entry with candidate ArcGIS service paths.",
    sourceUrl: "https://geology.data.nt.gov.au",
    documentationUrl: "https://geology.data.nt.gov.au",
    capabilitiesCandidates: [
      "https://geology.data.nt.gov.au/server/services/GDP/MapServer/WMSServer",
      "https://geology.data.nt.gov.au/server/rest/services/GDP/MapServer/WMSServer"
    ],
    defaultLayerHints: [],
    tags: ["nt", "geology data"],
    licence: "Northern Territory Government geospatial data terms as published by the source portal."
  }
];

export function getSourceCatalog() {
  return services;
}

export function getSourceById(serviceId: string) {
  return services.find((service) => service.id === serviceId);
}
