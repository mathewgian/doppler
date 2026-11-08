import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { bandEnvelope, locateByArrival } from "./arrival";
import { distanceM, type FlightTrack } from "./geo";
import { terrainElevation, type TerrainGrid } from "./terrain";

/**
 * Reference standard: iPhone recording at Kitsilano / English Bay, 2025-07-19 18:43:05 PDT
 * (2025-07-20 01:43:05 UTC) during the Snowbirds pass. Its known position is used ONLY here,
 * to check the acoustic + ADS-B result; the app never reads location tags.
 */
const TRUTH = { lat: 49.2868, lon: -123.1431 };
const pcm = readFileSync("src/lib/acoustics/fixtures/kitsilano-reference-16k.pcm");
const samples = Float32Array.from(new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2), v => v / 32768);
const fixture = JSON.parse(readFileSync("src/lib/acoustics/fixtures/kitsilano-reference-flights.json", "utf8")) as { recordingStartUnix: number; tracks: FlightTrack[] };
const terrain = JSON.parse(readFileSync("public/terrain/metro-vancouver.json", "utf8")) as TerrainGrid;
const elevationAt = (lat: number, lon: number) => terrainElevation(terrain, lat, lon);

describe("Kitsilano reference recording", () => {
  const env = bandEnvelope(samples, 16000)!;

  it("shows a jet-roar rise of at least 6 dB", () => {
    expect(env.riseDb).toBeGreaterThanOrEqual(6);
  });

  it("locates the recording within 1 km of Kitsilano from audio and archived flights alone", async () => {
    // iPhone creation times are network-synced, so the embedded start time is trusted to ±5 s.
    const result = await locateByArrival(env, fixture.tracks, { clockSigma: 5, clipStart: fixture.recordingStartUnix, elevationAt });
    const top = result.candidates[0];
    expect(top).toBeDefined();
    expect(distanceM(top.lat, top.lon, TRUTH.lat, TRUTH.lon)).toBeLessThan(1000);
    expect(top.matches[0].callsign).toBe("SNBD1");
    expect(result.confidence).toBe("low");
  });

  it("finds nothing when the archive has no aircraft near the recording time", async () => {
    const later = fixture.tracks.map(t => ({ ...t, samples: t.samples.map(s => ({ ...s, t: s.t + 3600 })) }));
    expect((await locateByArrival(env, later, { clockSigma: 30, clipStart: fixture.recordingStartUnix, elevationAt })).candidates).toHaveLength(0);
  });

  it("rejects steady noise with no rise", async () => {
    let seed = 7; const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
    const noise = Float32Array.from({ length: samples.length }, () => rand() * 0.1);
    const flat = bandEnvelope(noise, 16000)!;
    expect((await locateByArrival(flat, fixture.tracks, { clockSigma: 30, clipStart: fixture.recordingStartUnix, elevationAt })).candidates).toHaveLength(0);
  });
});
