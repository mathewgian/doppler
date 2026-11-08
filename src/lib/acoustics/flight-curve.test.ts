import { describe, expect, it } from "vitest";
import { flightCurve, ratioAt, scoreCurve } from "./flight-curve";
import { makeProjection, type FlightTrack } from "./geo";
import { terrainElevation } from "./terrain";
import { archiveWindows, MAX_RECORDING_SECONDS } from "./search-rules";
import { locate, type ObservedEvent } from "./locate";

const t0 = 1700000000, projection = makeProjection(49.2, -123);
const flight: FlightTrack = { icao24: "abc123", callsign: "", samples: Array.from({ length: 25 }, (_, i) => {
  const s = i * 5, ll = projection.toLatLon((s - 60) * 100, 600);
  return { ...ll, t: t0 + s, alt: 1000 + Math.max(0, s - 60) * 2 };
}) };
describe("full flight geometry and terrain", () => {
  it("uses emission-time radial velocity and distance-delayed reception", () => {
    const curve = flightCurve(flight, 49.2, -123, 500);
    const first = curve[0], distance = Math.hypot(-6000, 600, 500);
    expect(first.arrival).toBeCloseTo(t0 + distance / 343, 5);
    expect(first.ratio).toBeCloseTo(1 / (1 - 600000 / distance / 343), 8);
    expect(ratioAt(curve, t0)).toBeUndefined();
  });
  it("changes the modeled curve with terrain height", () => {
    const high = flightCurve(flight, 49.2, -123, 500), low = flightCurve(flight, 49.2, -123, 0);
    expect(high[60].arrival).toBeLessThan(low[60].arrival);
  });
  it("sweeps fundamental frequency but penalizes the wrong locked time", () => {
    const curve = flightCurve(flight, 49.2, -123, 500);
    const ridge = Array.from({ length: 70 }, (_, i) => ({ t: 25 + i, f: (ratioAt(curve, t0 + 25 + i) ?? 0) * 180 }));
    const correct = scoreCurve(curve, ridge, 180 / 1.02, t0, 0);
    expect(correct.cost).toBeLessThan(0.001);
    expect(correct.frequency).toBeCloseTo(180, 4);
    expect(scoreCurve(curve, ridge, 180, t0, 15).cost).toBeGreaterThan(correct.cost + 1);
  });
  it("does not create sound curves across missing archive intervals", () => {
    const broken = { ...flight, samples: [flight.samples[0], flight.samples[12], flight.samples[24]] };
    expect(flightCurve(broken, 49.2, -123, 0)).toEqual([]);
  });
  it("bilinearly samples terrain and treats coastal negative values as water level", () => {
    const grid = { rows: 2, cols: 2, latMin: 49, latMax: 50, lonMin: -124, lonMax: -123, values: [0, 100, 200, 300] };
    expect(terrainElevation(grid, 49.5, -123.5)).toBe(150);
    expect(terrainElevation({ ...grid, values: [-10, -10, -10, -10] }, 49.5, -123.5)).toBe(0);
  });
  it("supports recordings containing two events 920 seconds apart through bounded queries", () => {
    expect(MAX_RECORDING_SECONDS).toBeGreaterThan(920);
    const windows = archiveWindows(t0, t0 + 1800 + 86400);
    expect(windows[0][0]).toBe(t0);
    expect(windows.at(-1)?.[1]).toBe(t0 + 88200);
    expect(windows.every(([a, b]) => b - a <= 1320)).toBe(true);
  });
  it("refines a terrain-aware candidate using complete measured curve geometry", async () => {
    const curve = flightCurve(flight, 49.2, -123, 500), slant = Math.hypot(600, 500);
    const event: ObservedEvent = { id: 1, tAbs: t0 + 60 + slant / 343, speed: 100, slant, sigmaLogD: 0.2, sigmaLogV: 0.1, f0: 180, track: Array.from({ length: 70 }, (_, i) => ({ t: 25 + i, f: (ratioAt(curve, t0 + 25 + i) ?? 0) * 180 })) };
    const result = await locate([event], [flight], { clipStart: t0, clipEnd: t0 + 120, clockSigma: 5, elevationAt: () => 500, region: { name: "Metro Vancouver", latMin: 49.19, latMax: 49.21, lonMin: -123.02, lonMax: -122.98 } });
    expect(result.candidates[0]?.matches[0]?.curveCost).toBeLessThan(0.2);
    expect(Math.abs(result.candidates[0].lat - 49.2)).toBeLessThan(0.002);
  });
});