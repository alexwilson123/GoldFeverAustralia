import { jsPDF } from "jspdf";
import type { FeatureCollection } from "geojson";
import type { AnalysisResponse } from "@/lib/types";

function downloadBlob(filename: string, type: string, content: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportGeoJson(filename: string, geojson: FeatureCollection) {
  downloadBlob(filename, "application/geo+json", JSON.stringify(geojson, null, 2));
}

export function exportKml(filename: string, geojson: FeatureCollection) {
  const placemarks = geojson.features
    .map((feature) => {
      if (feature.geometry?.type !== "Point") return "";
      const [lng, lat] = feature.geometry.coordinates;
      return `
        <Placemark>
          <name>${String(feature.properties?.name ?? "Candidate")}</name>
          <description>${String(feature.properties?.reasoning ?? "")}</description>
          <Point><coordinates>${lng},${lat},0</coordinates></Point>
        </Placemark>`;
    })
    .join("");

  const kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    ${placemarks}
  </Document>
</kml>`;

  downloadBlob(filename, "application/vnd.google-earth.kml+xml", kml);
}

export function exportPdfReport(filename: string, analysis: AnalysisResponse) {
  const doc = new jsPDF();
  doc.setFontSize(20);
  doc.text("AussieProspect AI Report", 16, 20);
  doc.setFontSize(11);
  doc.text(analysis.summary, 16, 32, { maxWidth: 178 });
  doc.text(`Method: ${analysis.method}`, 16, 46);
  doc.text(`Supporting features: ${analysis.supportingFeatureCount}`, 16, 54);

  let y = 68;
  analysis.candidates.forEach((candidate, index) => {
    doc.setFontSize(13);
    doc.text(`${index + 1}. ${candidate.name}`, 16, y);
    y += 7;
    doc.setFontSize(10);
    doc.text(`Confidence ${Math.round(candidate.confidence * 100)}%`, 16, y);
    y += 6;
    doc.text(candidate.reasoning.join(" "), 16, y, { maxWidth: 178 });
    y += 18;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save(filename);
}
