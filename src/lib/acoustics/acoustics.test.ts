import { describe, expect, it } from "vitest";
import { dopplerFreq } from "./doppler";
import { detectEvents } from "./events";
import { REGION, SPEED_OF_SOUND as C, distanceM, makeProjection, type FlightTrack } from "./geo";
import { locate, toObserved } from "./locate";
import { computeSpectrogram } from "./spectrogram";

const RATE = 4000, DUR = 120, T0 = 1_700_000_000;
const proj = makeProjection((REGION.latMin + REGION.latMax) / 2, (REGION.lonMin + REGION.lonMax) / 2);
const L = { x: 2000, y: 0 };

// deterministic noise
let seed = 7;
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const gauss = () => Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd());

interface Plane { id: string; dir: [number, number]; offset: number; alt: number; speed: number; cpaClip: number; f0: number; audible: boolean }
// flies along `dir`; passes the listener's closest point at clip time cpaClip (emission time)
const planes: Plane[] = [
  { id: "aaa111", dir: [1, 0], offset: 700, alt: 600, speed: 120, cpaClip: 40, f0: 180, audible: true },
  { id: "bbb222", dir: [0, 1], offset: -500, alt: 800, speed: 90, cpaClip: 85, f0: 140, audible: true },
  { id: "ccc333", dir: [1, 0], offset: -3000, alt: 700, speed: 120, cpaClip: 41, f0: 200, audible: false },
  { id: "ddd444", dir: [0, 1], offset: 4000, alt: 900, speed: 100, cpaClip: 84, f0: 160, audible: false },
];
const slantOf = (p: Plane) => Math.hypot(p.offset, p.alt);

function synth(): Float32Array {
  const x = new Float32Array(RATE * DUR);
  for (let i = 0; i < x.length; i++) x[i] = 0.04 * gauss();
  for (const p of planes.filter(q => q.audible)) {
    const d = slantOf(p), tcpa = p.cpaClip + d / C;
    let ph1 = 0, ph2 = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / RATE, s = t - tcpa;
      const f = dopplerFreq(s, p.f0, p.speed, d);
      ph1 += (2 * Math.PI * f) / RATE; ph2 += (2 * Math.PI * 2 * f) / RATE;
      const amp = 0.35 * Math.max(0.15, d / Math.hypot(d, p.speed * s));
      x[i] += amp * Math.sin(ph1) + 0.5 * amp * Math.sin(ph2);
    }
  }
  return x;
}

function flights(): FlightTrack[] {
  return planes.map(p => {
    const samples = [];
    for (let t = -60; t <= 220; t += 10) {
      const along = p.speed * (t - p.cpaClip) + (p.dir[0] ? L.x : L.y); // 3D speed ~ ground speed (level flight)
      const x = p.dir[0] ? along : L.x + p.offset, y = p.dir[0] ? L.y + p.offset : along;
      const ll = proj.toLatLon(x, y);
      samples.push({ t: T0 + t, lat: ll.lat, lon: ll.lon, alt: p.alt });
    }
    return { icao24: p.id, callsign: p.id.toUpperCase(), samples };
  });
}

describe("acoustic geolocation", () => {
  const spec = computeSpectrogram(synth(), RATE);
  const events = detectEvents(spec);

  it("recovers speed, slant range and timing of both flyovers from audio alone", () => {
    expect(events.length).toBe(2);
    const [a, b] = events;
    const pa = planes[0], pb = planes[1];
    expect(Math.abs(a.tCpa - (pa.cpaClip + slantOf(pa) / C))).toBeLessThan(2);
    expect(Math.abs(b.tCpa - (pb.cpaClip + slantOf(pb) / C))).toBeLessThan(2);
    expect(Math.abs(Math.log(a.speed / pa.speed))).toBeLessThan(0.1);
    expect(Math.abs(Math.log(b.speed / pb.speed))).toBeLessThan(0.1);
    expect(Math.abs(Math.log(a.slant / slantOf(pa)))).toBeLessThan(0.2);
    expect(Math.abs(Math.log(b.slant / slantOf(pb)))).toBeLessThan(0.2);
  });

  it("finds the listener within 400 m even when the clock is 7 s off", async () => {
    const guessStart = T0 + 7;
    const res = await locate(toObserved(events, guessStart), flights(), { clockSigma: 20, clipStart: guessStart, clipEnd: guessStart + DUR });
    const ll = proj.toLatLon(L.x, L.y);
    expect(res.candidates.length).toBeGreaterThan(0);
    expect(distanceM(res.candidates[0].lat, res.candidates[0].lon, ll.lat, ll.lon)).toBeLessThan(400);
    expect(Math.abs(res.candidates[0].clockOffset + 7)).toBeLessThanOrEqual(5);
    expect(res.candidates[0].matched).toBe(2);
  }, 60000);

  it("reports no location when no aircraft flew past at that time", async () => {
    const later = flights().map(f => ({ ...f, samples: f.samples.map(p => ({ ...p, t: p.t + 600 })) }));
    const res = await locate(toObserved(events, T0), later, { clockSigma: 5, clipStart: T0, clipEnd: T0 + DUR });
    expect(res.confidence).toBe("none");
    expect(res.candidates).toHaveLength(0);
  }, 60000);

  it("does not hear a flyover in plain noise", () => {
    const noise = new Float32Array(RATE * 60);
    for (let i = 0; i < noise.length; i++) noise[i] = 0.05 * gauss();
    expect(detectEvents(computeSpectrogram(noise, RATE)).length).toBe(0);
  });
  it("never labels a single-aircraft constraint as medium or high confidence", async () => {
    const res = await locate(toObserved(events.slice(0, 1), T0), flights().slice(0, 1), { clockSigma: 5, clipStart: T0, clipEnd: T0 + DUR });
    expect(res.candidates.length).toBeGreaterThan(0);
    expect(res.confidence).toBe("low");
  });
});
