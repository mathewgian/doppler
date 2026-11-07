export const HIKER_DEMO = {
  location: { lat: 49.686508362919426, lng: -123.13552565162448, name: "Stawamus Chief", address: "Squamish, British Columbia" },
  timing: { fadeMs: 1000, zoomMs: 4500, searchMs: 9000 },
  search: { initialRadiusM: 2400, finalRadiusM: 25 },
  // Fictional flight samples. Altitude is metres; velocity is metres/second; timestamps are UTC.
  flight: [
    { lat: 49.655, lng: -123.19, timestamp: "2026-11-07T22:40:00Z", altitudeM: 2200, velocityMps: 125 },
    { lat: 49.674, lng: -123.155, timestamp: "2026-11-07T22:40:28Z", altitudeM: 2250, velocityMps: 128 },
    { lat: 49.693, lng: -123.12, timestamp: "2026-11-07T22:40:56Z", altitudeM: 2280, velocityMps: 130 },
    { lat: 49.712, lng: -123.085, timestamp: "2026-11-07T22:41:24Z", altitudeM: 2300, velocityMps: 130 },
  ],
  // Scripted teaching values, not measurements from the recording.
  dopplerHz: [185, 174, 160, 145, 134],
};

/** Reduced motion uses timed discrete updates, never skips a story phase. */
export function demoProgress(elapsedMs: number, durationMs: number, animate: boolean) {
  const p = Math.max(0, Math.min(1, elapsedMs / durationMs));
  return animate || p === 1 ? p : Math.floor(p * 4) / 4;
}

export function demoSample(progress: number) {
  const flight = HIKER_DEMO.flight;
  const timestamps = flight.map(p => Date.parse(p.timestamp));
  const t = timestamps[0] + Math.max(0, Math.min(1, progress)) * (timestamps[timestamps.length - 1] - timestamps[0]);
  let i = 0;
  while (i < flight.length - 2 && t > timestamps[i + 1]) i++;
  const a = flight[i], b = flight[i + 1];
  const f = (t - timestamps[i]) / (timestamps[i + 1] - timestamps[i]);
  return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f,
    altitudeM: a.altitudeM + (b.altitudeM - a.altitudeM) * f,
    velocityMps: a.velocityMps + (b.velocityMps - a.velocityMps) * f, timestamp: t };
}

export function demoRadius(progress: number) {
  const p = Math.max(0, Math.min(1, progress));
  return HIKER_DEMO.search.finalRadiusM + (HIKER_DEMO.search.initialRadiusM - HIKER_DEMO.search.finalRadiusM) * (1 - p) ** 2;
}