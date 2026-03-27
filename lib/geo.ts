import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

export function getGeometryCenter(geometry: Geometry): [number, number] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates[1], geometry.coordinates[0]];
    case "MultiPoint":
    case "LineString":
      return averagePositions(geometry.coordinates);
    case "MultiLineString":
    case "Polygon":
      return averagePositions(geometry.coordinates.flat());
    case "MultiPolygon":
      return averagePositions(geometry.coordinates.flat(2));
    case "GeometryCollection":
      return getGeometryCenter(geometry.geometries[0] ?? { type: "Point", coordinates: [133, -25] });
    default:
      return [-25, 133];
  }
}

function averagePositions(coords: Position[]): [number, number] {
  if (!coords.length) return [-25, 133];
  const [sumX, sumY] = coords.reduce(
    (acc, item) => [acc[0] + Number(item[0]), acc[1] + Number(item[1])],
    [0, 0]
  );
  return [sumY / coords.length, sumX / coords.length];
}

export function bboxFromGeometry(geometry: Geometry): [number, number, number, number] {
  const positions = flattenGeometry(geometry);
  const xs = positions.map((point) => point[0]);
  const ys = positions.map((point) => point[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

export function bboxFromFeatureCollection(
  input: FeatureCollection | Feature<Geometry>
): [number, number, number, number] {
  if ("features" in input) {
    const boxes = input.features
      .filter((feature): feature is Feature<Geometry> => Boolean(feature.geometry))
      .map((feature) => bboxFromGeometry(feature.geometry));

    if (!boxes.length) return [112, -44, 154, -10];

    return [
      Math.min(...boxes.map((box) => box[0])),
      Math.min(...boxes.map((box) => box[1])),
      Math.max(...boxes.map((box) => box[2])),
      Math.max(...boxes.map((box) => box[3]))
    ];
  }

  return bboxFromGeometry(input.geometry);
}

function flattenGeometry(geometry: Geometry): Position[] {
  switch (geometry.type) {
    case "Point":
      return [geometry.coordinates];
    case "MultiPoint":
    case "LineString":
      return geometry.coordinates;
    case "MultiLineString":
    case "Polygon":
      return geometry.coordinates.flat();
    case "MultiPolygon":
      return geometry.coordinates.flat(2);
    case "GeometryCollection":
      return geometry.geometries.flatMap((item) => flattenGeometry(item));
    default:
      return [[133, -25]];
  }
}

export function featureCollection(features: Feature[]): FeatureCollection {
  return {
    type: "FeatureCollection",
    features
  };
}
