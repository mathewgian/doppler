import { describe, it, expect } from "vitest";
import { resultToGeoJSON } from "./geojson";
describe("geojson export", () => {
  it("emits lon/lat point and closed uncertainty polygon", () => {
    const g = resultToGeoJSON({ candidates: [{ lat: 49.28, lon: -123.15, mass: 1, cost: 0, radiusM: 700, matched: 1, clockOffset: 0, matches: [] }], heat: [], confidence: "low", aircraftConsidered: 1, cells: 1 });
    expect(g.features[0].geometry.coordinates).toEqual([-123.15, 49.28]);
    const ring = (g.features[1].geometry.coordinates as number[][][])[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });
});
