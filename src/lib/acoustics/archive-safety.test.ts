import { describe, it, expect } from "vitest";
import { locate } from "./locate";
import type { FlightTrack } from "./geo";
const t = 1700000000;
const event = { id: 1, tAbs: t + 60, speed: 100, slant: 500, sigmaLogD: 0.2, sigmaLogV: 0.1 };
const opts = { clockSigma: 5, clipStart: t, clipEnd: t + 120, region: { name: "Metro Vancouver", latMin: 49.19, latMax: 49.21, lonMin: -123.01, lonMax: -122.99 } };
describe("archive matching safeguards", () => {
  it("does not interpolate a flight across a one-minute archive gap", async () => {
    const tracks: FlightTrack[] = [{ icao24: "abc123", callsign: "", samples: [
      { t, lat: 49.2, lon: -123.1, alt: 500 },
      { t: t + 60, lat: 49.2, lon: -123, alt: 500 },
      { t: t + 120, lat: 49.2, lon: -122.9, alt: 500 },
    ] }];
    expect((await locate([event], tracks, opts)).candidates).toHaveLength(0);
  });
  it("does not derive candidates from missing altitude", async () => {
    const track = { icao24: "abc123", callsign: "", samples: [0, 10, 20].map(s => ({ t: t + s, lat: 49.2, lon: -123, alt: NaN })) };
    expect((await locate([event], [track], opts)).aircraftConsidered).toBe(0);
  });
});