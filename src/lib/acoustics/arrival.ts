import { REGION, SPEED_OF_SOUND as C, makeProjection, type FlightTrack, type Region } from "./geo";
import { fftInPlace } from "./spectrogram";
import type { Candidate, LocateResult } from "./locate";

/**
 * Broadband arrival matching ("jet-roar" evidence).
 *
 * Fast, low jets (e.g. an airshow pass) are mostly broadband turbulence rather than a clean tone, so no
 * single Doppler ridge exists. Their high-frequency roar is still physical evidence: it is absorbed by
 * air at tens of dB per kilometre, so it rises above the background only when an aircraft is close, and
 * it arrives delayed by distance / speed of sound. For each listener position we predict the received
 * 3–6 kHz level from every archived aircraft (spherical spreading + atmospheric absorption + emission
 * delay) and compare its shape with the measured band level.
 *
 * Calibrated against the Kitsilano reference recording (2025-07-19 18:43:05 PDT, Snowbirds SNBD1 pass).
 */
export const ARRIVAL_RULES = {
  bandLow: 3000,
  bandHigh: 6000,
  /** dB per metre in 3–6 kHz at ~20 °C / 60 % RH (ISO 9613-1 order of magnitude). */
  absorption: 0.02,
  /** A source must be at least as audible as one 2.5 km away; farther aircraft cannot explain the band. */
  audibleM: 2500,
  stepS: 0.05,
  /** Measured band must rise this much above its own background. */
  minRiseDb: 6,
  /** Predicted shape must vary at least this much to be informative. */
  minPredictedRangeDb: 4,
  minCorrelation: 0.6,
  coarseGridM: 250,
  fineGridM: 50,
};

export interface BandEnvelope { t: Float64Array; db: Float64Array; riseDb: number }

/** Smoothed band-level envelope (dB) of a mono recording. Needs a sample rate covering the band. */
export function bandEnvelope(samples: Float32Array, rate: number, lo = ARRIVAL_RULES.bandLow, hi = ARRIVAL_RULES.bandHigh): BandEnvelope | null {
  if (rate / 2 < hi) return null;
  const n = 1024, hop = Math.max(1, Math.round(rate * 0.01));
  const frames = Math.floor((samples.length - n) / hop) + 1;
  if (frames < 50) return null;
  const b0 = Math.ceil(lo * n / rate), b1 = Math.floor(hi * n / rate);
  const win = new Float64Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  const re = new Float64Array(n), im = new Float64Array(n);
  const power = new Float64Array(frames);
  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    for (let i = 0; i < n; i++) { re[i] = samples[off + i] * win[i]; im[i] = 0; }
    fftInPlace(re, im);
    let s = 0; for (let k = b0; k <= b1; k++) s += re[k] * re[k] + im[k] * im[k];
    power[f] = s / (b1 - b0 + 1);
  }
  const per = Math.max(1, Math.round(ARRIVAL_RULES.stepS / (hop / rate)));
  const m = Math.floor(frames / per);
  const raw = new Float64Array(m);
  for (let j = 0; j < m; j++) { let s = 0; for (let k = 0; k < per; k++) s += power[j * per + k]; raw[j] = 10 * Math.log10(s / per + 1e-20); }
  const db = new Float64Array(m), t = new Float64Array(m);
  for (let j = 0; j < m; j++) {
    let s = 0, c = 0;
    for (let k = -2; k <= 2; k++) if (j + k >= 0 && j + k < m) { s += raw[j + k]; c++; }
    db[j] = s / c; t[j] = ((j + 0.5) * per * hop + n / 2) / rate;
  }
  const sorted = Array.from(db).sort((a, b) => a - b);
  const riseDb = sorted[Math.floor(m * 0.95)] - sorted[Math.floor(m * 0.05)];
  return { t, db, riseDb };
}

interface Prepared { icao24: string; callsign: string; t: Float64Array; x: Float64Array; y: Float64Array; z: Float64Array }

export interface ArrivalOptions {
  region?: Region;
  clockSigma: number;
  clipStart: number;
  elevationAt?: (lat: number, lon: number) => number;
  onProgress?: (fraction: number) => void;
}

function pearson(a: Float64Array, b: Float64Array) {
  const n = a.length; let ma = 0, mb = 0;
  for (let i = 0; i < n; i++) { ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let sab = 0, saa = 0, sbb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; saa += da * da; sbb += db * db; }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : -1;
}

export async function locateByArrival(env: BandEnvelope, flights: FlightTrack[], opts: ArrivalOptions): Promise<LocateResult> {
  const R = ARRIVAL_RULES, region = opts.region ?? REGION;
  const empty: LocateResult = { candidates: [], heat: [], confidence: "none", aircraftConsidered: 0, cells: 0 };
  if (env.riseDb < R.minRiseDb) return empty;
  const proj = makeProjection((region.latMin + region.latMax) / 2, (region.lonMin + region.lonMax) / 2);
  const gate = -20 * Math.log10(R.audibleM) - R.absorption * R.audibleM;
  const tFirst = env.t[0], tLast = env.t[env.t.length - 1];
  const sigma = opts.clockSigma, offStep = Math.max(1, sigma / 30);

  // Aircraft resampled at 0.1 s over the emission times that can reach the clip (never across gaps > 30 s).
  const air: Prepared[] = [];
  const eBegin = opts.clipStart + tFirst - sigma - 10, eEnd = opts.clipStart + tLast + sigma;
  for (const f of flights) {
    const s = [...f.samples].filter(p => [p.t, p.lat, p.lon, p.alt].every(Number.isFinite) && p.alt > 0).sort((a, b) => a.t - b.t);
    const ts: number[] = [], xs: number[] = [], ys: number[] = [], zs: number[] = [];
    for (let i = 0; i < s.length - 1; i++) {
      const a = s[i], b = s[i + 1];
      if (b.t <= a.t || b.t - a.t > 30 || b.t < eBegin || a.t > eEnd) continue;
      const pa = proj.toXY(a.lat, a.lon), pb = proj.toXY(b.lat, b.lon);
      for (let te = Math.max(eBegin, Math.ceil(a.t * 10) / 10); te < Math.min(eEnd, b.t); te += 0.1) {
        const u = (te - a.t) / (b.t - a.t);
        ts.push(te); xs.push(pa.x + u * (pb.x - pa.x)); ys.push(pa.y + u * (pb.y - pa.y)); zs.push(a.alt + u * (b.alt - a.alt));
      }
    }
    if (ts.length >= 10) air.push({ icao24: f.icao24, callsign: f.callsign, t: Float64Array.from(ts), x: Float64Array.from(xs), y: Float64Array.from(ys), z: Float64Array.from(zs) });
  }
  if (!air.length) return { ...empty, aircraftConsidered: 0 };

  const m = env.t.length;
  const pred = new Float64Array(m), q = new Float64Array(m);
  const evalCell = (px: number, py: number) => {
    const ll = proj.toLatLon(px, py);
    const ground = opts.elevationAt?.(ll.lat, ll.lon) ?? 0;
    // Per aircraft: arrival-time curve and received power, independent of the clock shift.
    const contrib: { ta: Float64Array; p: Float64Array; a: number; minR: number; at: number }[] = [];
    for (let a = 0; a < air.length; a++) {
      const A = air[a], n = A.t.length;
      let lMax = -Infinity, minR = Infinity, at = 0;
      const ta = new Float64Array(n), p = new Float64Array(n);
      for (let i = 0; i < n; i++) {
        const dx = A.x[i] - px, dy = A.y[i] - py, dz = Math.max(1, A.z[i] - ground);
        const r = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const L = -20 * Math.log10(r) - R.absorption * r;
        ta[i] = A.t[i] + r / C - opts.clipStart; p[i] = 10 ** (L / 10);
        if (L > lMax) lMax = L;
        if (r < minR) { minR = r; at = A.t[i]; }
      }
      if (lMax >= gate) contrib.push({ ta, p, a, minR, at });
    }
    if (!contrib.length) return null;
    let best = { c: -2, off: 0, a: -1, minR: 0, at: 0 };
    for (let off = -sigma; off <= sigma + 1e-9; off += offStep) {
      pred.fill(0);
      let dom = contrib[0], domPk = -1;
      for (const k of contrib) {
        let j = 0, pk = 0;
        for (let i = 0; i < m; i++) {
          const tt = env.t[i] + off; // envelope time on the archive clock
          while (j < k.ta.length - 2 && k.ta[j + 1] < tt) j++;
          if (tt < k.ta[0] || tt > k.ta[k.ta.length - 1]) continue;
          const u = (tt - k.ta[j]) / (k.ta[j + 1] - k.ta[j] || 1);
          const v = k.p[j] + Math.min(1, Math.max(0, u)) * (k.p[j + 1] - k.p[j]);
          pred[i] += v; if (v > pk) pk = v;
        }
        if (pk > domPk) { domPk = pk; dom = k; }
      }
      let pMax = 0; for (let i = 0; i < m; i++) pMax = Math.max(pMax, pred[i]);
      if (pMax <= 0) continue;
      for (const F of [10, 20]) {
        const floor = pMax / 10 ** (F / 10);
        let qMin = Infinity, qMax = -Infinity;
        for (let i = 0; i < m; i++) { q[i] = 10 * Math.log10(pred[i] + floor); qMin = Math.min(qMin, q[i]); qMax = Math.max(qMax, q[i]); }
        if (qMax - qMin < R.minPredictedRangeDb) continue;
        const c = pearson(q, env.db);
        if (c > best.c) best = { c, off, a: dom.a, minR: dom.minR, at: dom.at };
      }
    }
    return best.a >= 0 ? best : null;
  };

  // Coarse grid only where some aircraft could be audible.
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const A of air) for (let i = 0; i < A.t.length; i += 10) { x0 = Math.min(x0, A.x[i]); x1 = Math.max(x1, A.x[i]); y0 = Math.min(y0, A.y[i]); y1 = Math.max(y1, A.y[i]); }
  const sw = proj.toXY(region.latMin, region.lonMin), ne = proj.toXY(region.latMax, region.lonMax);
  x0 = Math.max(sw.x, x0 - R.audibleM); x1 = Math.min(ne.x, x1 + R.audibleM); y0 = Math.max(sw.y, y0 - R.audibleM); y1 = Math.min(ne.y, y1 + R.audibleM);
  type Cell = { x: number; y: number; c: number; off: number; a: number; minR: number; at: number };
  const cells: Cell[] = [];
  const near = (px: number, py: number) => air.some(A => { for (let i = 0; i < A.t.length; i += 5) if (Math.hypot(A.x[i] - px, A.y[i] - py) < R.audibleM) return true; return false; });
  for (let y = y0; y <= y1; y += R.coarseGridM) {
    for (let x = x0; x <= x1; x += R.coarseGridM) {
      if (!near(x, y)) continue;
      const r = evalCell(x, y); if (r) cells.push({ x, y, ...r });
    }
    opts.onProgress?.(0.8 * (y - y0) / Math.max(1, y1 - y0));
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  if (!cells.length) return { ...empty, aircraftConsidered: air.length };
  cells.sort((a, b) => b.c - a.c);
  const coarseBest = cells[0];
  if (coarseBest.c < R.minCorrelation) return { ...empty, aircraftConsidered: air.length, cells: cells.length };

  // Fine grid around the best coarse cell.
  const fine: Cell[] = [];
  for (let dy = -500; dy <= 500; dy += R.fineGridM) for (let dx = -500; dx <= 500; dx += R.fineGridM) {
    const x = coarseBest.x + dx, y = coarseBest.y + dy;
    if (x < sw.x || x > ne.x || y < sw.y || y > ne.y) continue;
    const r = evalCell(x, y); if (r) fine.push({ x, y, ...r });
  }
  opts.onProgress?.(1);
  fine.sort((a, b) => b.c - a.c);
  const best = fine[0] ?? coarseBest;
  // Weighted centroid of near-equivalent fits: the evidence cannot separate them.
  const pool = fine.filter(c => c.c >= best.c - 0.02);
  let ws = 0, mx = 0, my = 0;
  for (const c of pool) { const w = Math.exp((c.c - best.c) / 0.005); ws += w; mx += w * c.x; my += w * c.y; }
  mx /= ws; my /= ws;
  let v = 0; for (const c of pool) { const w = Math.exp((c.c - best.c) / 0.005); v += w * ((c.x - mx) ** 2 + (c.y - my) ** 2); }
  // Floor set from the Kitsilano reference: along-path ambiguity left a 656 m error at a ±5 s clock.
  const radiusM = Math.max(700, Math.sqrt(v / ws) * 2);
  const ll = proj.toLatLon(mx, my);
  const A = air[best.a];
  const i0 = A.t.findIndex(t => t >= best.at);
  const speed = i0 > 0 && i0 < A.t.length ? Math.hypot(A.x[i0] - A.x[i0 - 1], A.y[i0] - A.y[i0 - 1]) / (A.t[i0] - A.t[i0 - 1]) : 0;
  const candidate: Candidate = {
    lat: ll.lat, lon: ll.lon, mass: pool.length / Math.max(1, fine.length), cost: 1 - best.c, radiusM, matched: 1, clockOffset: best.off,
    matches: [{ eventId: 0, icao24: A.icao24, callsign: A.callsign, slant: best.minR, speed, passedAt: best.at + best.minR / C }],
  };
  const heat = fine.filter(c => c.c >= best.c - 0.1).slice(0, 400).map(c => { const p = proj.toLatLon(c.x, c.y); return [p.lat, p.lon, Math.max(0, 1 - (best.c - c.c) / 0.1)] as [number, number, number]; });
  // One aircraft and loudness-shape evidence only: never more than low confidence.
  return { candidates: [candidate], heat, confidence: "low", aircraftConsidered: air.length, cells: cells.length + fine.length };
}
