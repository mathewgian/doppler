import type { LocateResult } from "./locate";

/** RFC 7946 FeatureCollection of candidate points plus uncertainty circles. */
export function resultToGeoJSON(result: LocateResult, meta: { fileName?: string; method?: string } = {}) {
  const features = result.candidates.flatMap((c, rank) => {
    const props = { rank: rank + 1, radius_m: Math.round(c.radiusM), confidence: result.confidence, method: meta.method ?? "doppler", source_file: meta.fileName ?? null, clock_offset_s: Math.round(c.clockOffset), aircraft: c.matches.map(m => m.callsign || m.icao24) };
    const ring: [number, number][] = [];
    const dLat = c.radiusM / 111320, dLon = dLat / Math.cos((c.lat * Math.PI) / 180);
    for (let i = 0; i <= 64; i++) { const a = (i / 64) * 2 * Math.PI; ring.push([+(c.lon + dLon * Math.cos(a)).toFixed(6), +(c.lat + dLat * Math.sin(a)).toFixed(6)]); }
    return [
      { type: "Feature", geometry: { type: "Point", coordinates: [+c.lon.toFixed(6), +c.lat.toFixed(6)] }, properties: { ...props, kind: "estimate" } },
      { type: "Feature", geometry: { type: "Polygon", coordinates: [ring] }, properties: { ...props, kind: "uncertainty" } },
    ];
  });
  return { type: "FeatureCollection" as const, features };
}

export function downloadGeoJSON(data: object, name: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/geo+json" }));
  const a = document.createElement("a"); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
