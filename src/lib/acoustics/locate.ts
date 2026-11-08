import { REGION, SPEED_OF_SOUND as C, makeProjection, type DopplerEvent, type FlightTrack, type Region } from "./geo";
import { flightCurve, scoreCurve } from "./flight-curve";
import type { Spectrogram } from "./spectrogram";

export interface ObservedEvent { id: number; tAbs: number; speed: number; slant: number; sigmaLogD: number; sigmaLogV: number; f0?: number; uncertain?: boolean; track?: { t: number; f: number }[] }

export interface LocateOptions {
  region?: Region;
  gridM?: number;
  /** how far (seconds) the recording clock could be off; the offset is shared by every event ("locked") */
  clockSigma: number;
  clipStart: number;
  clipEnd: number;
  groundElev?: number;
  elevationAt?: (lat: number, lon: number) => number;
  spectrogram?: Spectrogram;
  onProgress?: (fraction: number) => void;
}

export interface EventMatch { eventId: number; icao24: string; callsign: string; slant: number; speed: number; passedAt: number; curveCost?: number; frequency?: number }
export interface Candidate {
  lat: number; lon: number; mass: number; cost: number; radiusM: number;
  matched: number; clockOffset: number; matches: EventMatch[];
}
export interface LocateResult {
  candidates: Candidate[];
  heat: [number, number, number][];
  confidence: "high" | "medium" | "low" | "none";
  aircraftConsidered: number;
  cells: number;
}

const SIGMA_T = 4; // seconds: closest-approach timing + ADS-B interpolation error
const MISS = 30; // chi-square cost of an observed event that no aircraft explains
const SHAPE_GATE = 12;
const AUDIBLE_M = 2500;
const TEMPER = 2;

export function toObserved(events: DopplerEvent[], clipStartUnix: number): ObservedEvent[] {
  return events.map(e => ({ id: e.id, tAbs: clipStartUnix + e.tCpa, speed: e.speed, slant: e.slant, sigmaLogD: e.sigmaLogD, sigmaLogV: e.sigmaLogV, f0: e.f0, uncertain: e.uncertain, track: e.track }));
}

interface Prepared { icao24: string; callsign: string; t: Float64Array; x: Float64Array; y: Float64Array; z: Float64Array; x0: number; x1: number; y0: number; y1: number }

export async function locate(events: ObservedEvent[], flights: FlightTrack[], opts: LocateOptions): Promise<LocateResult> {
  const region = opts.region ?? REGION, grid = opts.gridM ?? 200;
  const lat0 = (region.latMin + region.latMax) / 2, lon0 = (region.lonMin + region.lonMax) / 2;
  const proj = makeProjection(lat0, lon0);
  const gnd = opts.groundElev ?? 0;
  const nE = events.length;

  const air: Prepared[] = [];
  for (const f of flights) {
    const s = [...f.samples].filter(p => [p.t, p.lat, p.lon, p.alt].every(Number.isFinite) && p.alt > 0).sort((a, b) => a.t - b.t).filter((p, i, a) => i === 0 || p.t > a[i - 1].t);
    if (s.length < 3) continue;
    const t = new Float64Array(s.length), x = new Float64Array(s.length), y = new Float64Array(s.length), z = new Float64Array(s.length);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    s.forEach((p, i) => { const q = proj.toXY(p.lat, p.lon); t[i] = p.t; x[i] = q.x; y[i] = q.y; z[i] = p.alt - gnd; x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y); });
    air.push({ icao24: f.icao24, callsign: f.callsign, t, x, y, z, x0, x1, y0, y1 });
  }

  const sw = proj.toXY(region.latMin, region.lonMin), ne = proj.toXY(region.latMax, region.lonMax);
  const nx = Math.floor((ne.x - sw.x) / grid) + 1, ny = Math.floor((ne.y - sw.y) / grid) + 1;
  const cost = new Float32Array(nx * ny).fill(nE * MISS);

  const step = Math.max(1, Math.min(5, Math.round(opts.clockSigma / 20)));
  const deltas: number[] = [];
  if (opts.clockSigma <= 300) for (let d = -opts.clockSigma; d <= opts.clockSigma + 1e-9; d += step) deltas.push(d);

  const aR = new Float64Array(air.length), aT = new Float64Array(air.length), aS = new Float64Array(air.length), aOk = new Uint8Array(air.length);
  const mCount = new Int32Array(nE);
  const mIdx = events.map(() => new Int32Array(air.length));
  const mShape = events.map(() => new Float64Array(air.length));
  const mT = events.map(() => new Float64Array(air.length));

  /** Evaluate one listener position. Returns cost and best clock offset. */
  const evalCell = (px: number, py: number) => {
    const ll = proj.toLatLon(px, py);
    const elevation = opts.elevationAt?.(ll.lat, ll.lon) ?? gnd;
    mCount.fill(0);
    for (let a = 0; a < air.length; a++) {
      aOk[a] = 0;
      const A = air[a];
      if (px < A.x0 - 9000 || px > A.x1 + 9000 || py < A.y0 - 9000 || py > A.y1 + 9000) continue;
      let bestR = Infinity, bestTau = 0, bestSpd = 0, edge = false;
      const n = A.t.length;
      for (let i = 0; i < n - 1; i++) {
        const dt = A.t[i + 1] - A.t[i];
        if (dt > 30 || dt <= 0) continue; // never fabricate a flight across archive gaps
        const dx = A.x[i + 1] - A.x[i], dy = A.y[i + 1] - A.y[i], dz = A.z[i + 1] - A.z[i];
        const rx = A.x[i] - px, ry = A.y[i] - py, rz = A.z[i] + gnd - elevation;
        if (rz <= 0) continue;
        const len2 = dx * dx + dy * dy + dz * dz;
        if (len2 < 1e-6 || Math.sqrt(len2) / dt > 340) continue;
        let s = -(rx * dx + ry * dy + rz * dz) / len2;
        const clamped = s <= 0 || s >= 1;
        s = s < 0 ? 0 : s > 1 ? 1 : s;
        const ex = rx + s * dx, ey = ry + s * dy, ez = rz + s * dz;
        const r = Math.sqrt(ex * ex + ey * ey + ez * ez);
        const arrived = A.t[i] + s * dt + r / C;
        if (arrived < opts.clipStart - opts.clockSigma || arrived > opts.clipEnd + opts.clockSigma) continue;
        if (r < bestR) {
          bestR = r; bestTau = A.t[i] + s * (A.t[i + 1] - A.t[i]);
          bestSpd = Math.sqrt(len2) / (A.t[i + 1] - A.t[i]);
          edge = clamped && ((s === 0 && i === 0) || (s === 1 && i === n - 2));
        }
      }
      if (edge || !isFinite(bestR) || bestR < 20) continue; // a flyover must pass through the data, not end at it
      aOk[a] = 1; aR[a] = bestR; aS[a] = bestSpd; aT[a] = bestTau + bestR / C;
      for (let k = 0; k < nE; k++) {
        const ev = events[k];
        const eD = Math.log(ev.slant / bestR) / ev.sigmaLogD, eV = Math.log(ev.speed / bestSpd) / ev.sigmaLogV;
        const shape = eD * eD + eV * eV;
        if (shape < SHAPE_GATE) { const m = mCount[k]++; mIdx[k][m] = a; mShape[k][m] = shape; mT[k][m] = aT[a]; }
      }
    }
    let bestCost = nE * MISS, bestDelta = 0;
    let any = false; for (let k = 0; k < nE; k++) if (mCount[k]) any = true;
    const cellDeltas = opts.clockSigma <= 300 ? deltas : [...new Set(events.flatMap((ev, k) => Array.from({ length: mCount[k] }, (_, m) => Math.round(mT[k][m] - ev.tAbs)).flatMap(d => [-4, 0, 4].map(j => d + j)).filter(d => Math.abs(d) <= opts.clockSigma)))];
    if (any) for (const delta of cellDeltas) {
      let total = 0;
      for (let k = 0; k < nE; k++) {
        let b = MISS;
        for (let m = 0; m < mCount[k]; m++) {
          const e = (events[k].tAbs + delta - mT[k][m]) / SIGMA_T;
          const c = mShape[k][m] + e * e; if (c < b) b = c;
        }
        total += b;
      }
      if (total < bestCost) { bestCost = total; bestDelta = delta; }
    }
    // silence: an audible aircraft that passes while the clip runs but explains no event argues against this spot
    let pen = 0;
    if (any) for (let a = 0; a < air.length && pen < 4; a++) {
      if (!aOk[a] || aR[a] > AUDIBLE_M) continue;
      const T = aT[a];
      if (T < opts.clipStart + bestDelta - 5 || T > opts.clipEnd + bestDelta + 5) continue;
      let explained = false;
      for (let k = 0; k < nE; k++) if (Math.abs(T - (events[k].tAbs + bestDelta)) < 15) { explained = true; break; }
      if (!explained) pen += 2;
    }
    return { cost: bestCost + pen, delta: bestDelta };
  };

  const deltaAt = new Float32Array(nx * ny);
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const r = evalCell(sw.x + ix * grid, sw.y + iy * grid);
      cost[iy * nx + ix] = r.cost; deltaAt[iy * nx + ix] = r.delta;
    }
    if (iy % 12 === 0) { opts.onProgress?.(iy / ny); await new Promise(res => setTimeout(res, 0)); }
  }
  opts.onProgress?.(1);

  let minCost = Infinity, minIdx = 0;
  for (let i = 0; i < cost.length; i++) if (cost[i] < minCost) { minCost = cost[i]; minIdx = i; }
  const w = new Float64Array(cost.length);
  let wMax = 0;
  for (let i = 0; i < cost.length; i++) { w[i] = Math.exp(-0.5 * (cost[i] - minCost) / TEMPER); wMax = Math.max(wMax, w[i]); }
  let wSum = 0; for (let i = 0; i < w.length; i++) wSum += w[i];

  const taken = new Uint8Array(cost.length);
  const candidates: Candidate[] = [];
  const clusterR = 1500;
  for (let n = 0; n < 5; n++) {
    let bi = -1, bw = 0;
    for (let i = 0; i < w.length; i++) if (!taken[i] && w[i] > bw) { bw = w[i]; bi = i; }
    if (bi < 0 || bw < 1e-3 * wMax) break;
    const cx = sw.x + (bi % nx) * grid, cy = sw.y + Math.floor(bi / nx) * grid;
    let mass = 0, mx = 0, my = 0;
    const members: number[] = [];
    for (let i = 0; i < w.length; i++) {
      if (taken[i]) continue;
      const x = sw.x + (i % nx) * grid, y = sw.y + Math.floor(i / nx) * grid;
      if (Math.hypot(x - cx, y - cy) <= clusterR) { taken[i] = 1; members.push(i); mass += w[i]; mx += w[i] * x; my += w[i] * y; }
    }
    mx /= mass; my /= mass;
    let v = 0;
    for (const i of members) { const x = sw.x + (i % nx) * grid, y = sw.y + Math.floor(i / nx) * grid; v += w[i] * ((x - mx) ** 2 + (y - my) ** 2); }
    const radiusM = Math.max(grid, Math.sqrt(v / mass));
    const peakX = cx, peakY = cy;
    const det = evalCell(peakX, peakY);
    const matches: EventMatch[] = [];
    for (let k = 0; k < nE; k++) {
      let b = MISS, bm = -1;
      for (let m = 0; m < mCount[k]; m++) {
        const e = (events[k].tAbs + det.delta - mT[k][m]) / SIGMA_T;
        const c = mShape[k][m] + e * e; if (c < b) { b = c; bm = m; }
      }
      if (bm >= 0 && b < MISS) { const a = mIdx[k][bm]; matches.push({ eventId: events[k].id, icao24: air[a].icao24, callsign: air[a].callsign, slant: aR[a], speed: aS[a], passedAt: mT[k][bm] }); }
    }
    const ll = proj.toLatLon(peakX, peakY);
    candidates.push({ lat: ll.lat, lon: ll.lon, mass: mass / wSum, cost: cost[bi], radiusM, matched: matches.length, clockOffset: det.delta, matches });
  }

  const heat: [number, number, number][] = [];
  const order = Array.from(w.keys()).filter(i => w[i] > 0.02 * wMax).sort((a, b) => w[b] - w[a]).slice(0, 400);
  for (const i of order) { const ll = proj.toLatLon(sw.x + (i % nx) * grid, sw.y + Math.floor(i / nx) * grid); heat.push([ll.lat, ll.lon, w[i] / wMax]); }

  const top = candidates[0];
  // Expensive full-trajectory scoring only on the strongest coarse neighborhoods.
  if (top?.matched && events.every(event => event.track?.length && event.f0)) {
    const refined: Candidate[] = [];
    for (const candidate of candidates.filter(c => c.matched > 0).slice(0, 3)) {
      const center = proj.toXY(candidate.lat, candidate.lon);
      let winner: Candidate | undefined;
      for (const spacing of [100, 50]) {
        const anchor = winner ? proj.toXY(winner.lat, winner.lon) : center;
        const extent = spacing === 100 ? 200 : 100;
        for (let dy = -extent; dy <= extent; dy += spacing) for (let dx = -extent; dx <= extent; dx += spacing) {
          const ll = proj.toLatLon(anchor.x + dx, anchor.y + dy);
          if (ll.lat < region.latMin || ll.lat > region.latMax || ll.lon < region.lonMin || ll.lon > region.lonMax) continue;
          const elevation = opts.elevationAt?.(ll.lat, ll.lon) ?? gnd;
          const models = candidate.matches.map(match => ({ match, event: events.find(e => e.id === match.eventId), flight: flights.find(f => f.icao24 === match.icao24) })).filter(pair => pair.flight && pair.event);
          const curves = models.map(pair => pair.flight ? flightCurve(pair.flight, ll.lat, ll.lon, elevation) : []);
          for (let shift = -8; shift <= 8; shift += 2) {
            const offset = candidate.clockOffset + shift;
            if (Math.abs(offset) > opts.clockSigma) continue;
            const geometry = evalCell(anchor.x + dx, anchor.y + dy);
            let loss = (nE - models.length) * 12 + geometry.cost * 0.05;
            const matches: EventMatch[] = [];
            models.forEach((pair, i) => {
              if (!pair.event?.track || !pair.event.f0) return;
              const score = scoreCurve(curves[i], pair.event.track, pair.event.f0, opts.clipStart, offset, opts.spectrogram);
              loss += score.cost;
              if (score.coverage >= 0.8 && score.cost < 6) matches.push({ ...pair.match, curveCost: score.cost, frequency: score.frequency });
            });
            if (!winner || loss < winner.cost) winner = { ...candidate, ...ll, cost: loss, clockOffset: offset, radiusM: Math.max(spacing, candidate.radiusM), matches, matched: matches.length };
          }
        }
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (winner?.matched) refined.push(winner);
    }
    refined.sort((a, b) => a.cost - b.cost);
    candidates.splice(0, candidates.length, ...refined);
    // Do not present the old coarse heat as the refined score surface.
    heat.splice(0, heat.length, ...refined.map(c => [c.lat, c.lon, Math.exp(-c.cost / 2)] as [number, number, number]));
  }
  const finalTop = candidates[0];
  let confidence: LocateResult["confidence"] = "none";
  if (finalTop && finalTop.matched > 0) {
    confidence = "low";
    const distinctAircraft = new Set(finalTop.matches.map(match => match.icao24)).size;
    const uncertain = events.some(e => e.uncertain);
    if (!uncertain && finalTop.mass >= 0.35 && distinctAircraft >= 2 && opts.clockSigma <= 120) confidence = "medium";
    if (!uncertain && finalTop.mass >= 0.6 && finalTop.matched === nE && distinctAircraft >= 2 && opts.clockSigma <= 120) confidence = "high";
  }
  void minIdx;
  return { candidates: finalTop && finalTop.matched > 0 ? candidates : [], heat: finalTop && finalTop.matched > 0 ? heat : [], confidence, aircraftConsidered: air.length, cells: nx * ny };
}
