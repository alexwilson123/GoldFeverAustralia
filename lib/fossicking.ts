import type { FeatureCollection, Point } from "geojson";

export const verifiedFossickingAreas: FeatureCollection<Point> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [147.637, -22.826],
      },
      properties: {
        name: "Central Gold District",
        jurisdiction: "Queensland",
        town: "Clermont",
        permit: "Queensland fossicking licence required",
        access: "General permission areas and special conditions apply",
        approximation: "Approximate district marker only. Use official PDF maps for exact permitted areas.",
        sourceUrl:
          "https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/central-gold",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [147.705, -23.527],
      },
      properties: {
        name: "Capricorn Region",
        jurisdiction: "Queensland",
        town: "Rockhampton region",
        permit: "Queensland fossicking licence required",
        access: "Check local site conditions and official maps",
        approximation: "Approximate regional marker only. Use official guidance for exact locations.",
        sourceUrl:
          "https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/capricorn-region",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [147.689, -23.459],
      },
      properties: {
        name: "Central Queensland Gemfields",
        jurisdiction: "Queensland",
        town: "Rubyvale / Sapphire / Anakie",
        permit: "Queensland fossicking licence required",
        access: "Check reserve access rules and local conditions",
        approximation: "Approximate district marker only. Use official maps for exact permitted grounds.",
        sourceUrl:
          "https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/central-qld",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [145.417, -17.517],
      },
      properties: {
        name: "Northern Queensland Fossicking",
        jurisdiction: "Queensland",
        town: "Atherton / Palmer region reference",
        permit: "Queensland fossicking licence required",
        access: "Check official district advice before travel",
        approximation: "Approximate regional marker only. Use official maps and conditions for exact sites.",
        sourceUrl:
          "https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/north-qld",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [152.021, -28.654],
      },
      properties: {
        name: "South East Queensland Fossicking",
        jurisdiction: "Queensland",
        town: "Warwick / Talgai reference",
        permit: "Queensland fossicking licence required",
        access: "Check official guidance for public access and conditions",
        approximation: "Approximate regional marker only. Use official maps for exact permitted areas.",
        sourceUrl:
          "https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/south-east",
      },
    },
    {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [144.253, -26.402],
      },
      properties: {
        name: "Western Opal Fields",
        jurisdiction: "Queensland",
        town: "Quilpie / Yowah reference",
        permit: "Queensland fossicking licence required",
        access: "Check local access rules and official maps",
        approximation: "Approximate regional marker only. Use official maps for exact permitted grounds.",
        sourceUrl:
          "https://www.qld.gov.au/recreation/activities/areas-facilities/fossicking/fossicking-areas-in-queensland/western-opal",
      },
    },
  ],
};
