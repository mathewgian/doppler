import { SPEED_OF_SOUND as C, makeProjection, type FlightTrack } from "./geo";
import type { Spectrogram } from "./spectrogram";

export interface CurvePoint { arrival: number; ratio: number }

/** Piecewise measured 3D trajectory; time is emission time, not reception time. */
export function flightCurve(flight: FlightTrack, lat: number, lon: number, elevation: number): CurvePoint[] {
  const projection = makeProjection(lat, lon);
  const samples = [...flight.samples].filter(p => [p.t, p.lat, p.lon, p.alt].every(Number.isFinite)).sort((a, b) => a.t - b.t);
  const curve: CurvePoint[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1], dt = b.t - a.t;
    if (dt <= 0 || dt > 30) continue;
    const pa = projection.toXY(a.lat, a.lon), pb = projection.toXY(b.lat, b.lon);
    const vx = (pb.x - pa.x) / dt, vy = (pb.y - pa.y) / dt, vz = (b.alt - a.alt) / dt;
    if (Math.hypot(vx, vy, vz) >= C) continue;
    for (let s = 0; s <= dt; s += Math.min(1, dt)) {
      const x = pa.x + vx * s, y = pa.y + vy * s, z = a.alt - elevation + vz * s;
      if (z <= 0) continue;
      const distance = Math.hypot(x, y, z);
      const radial = (x * vx + y * vy + z * vz) / distance;
      curve.push({ arrival: a.t + s + distance / C, ratio: 1 / (1 + radial / C) });
    }
  }
  return curve.sort((a, b) => a.arrival - b.arrival);
}

export function ratioAt(curve: CurvePoint[], reception: number): number | undefined {
  let lo = 0, hi = curve.length - 1;
  if (!curve.length || reception < curve[0].arrival || reception > curve[hi].arrival) return;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (curve[mid].arrival <= reception) lo = mid; else hi = mid; }
  const a = curve[lo], b = curve[hi], dt = b.arrival - a.arrival;
  // Never interpolate across missing ADS-B intervals, including skipped invalid segments.
  if (dt > 3 || dt < 0) return;
  return dt === 0 ? a.ratio : a.ratio + (b.ratio - a.ratio) * (reception - a.arrival) / dt;
}

export function saliencyAt(spec: Spectrogram, time: number, frequency: number): number | undefined {
  const frame = Math.round((time * spec.rate - spec.n / 2) / spec.hop);
  const bin = (frequency - spec.fLow) / spec.df, lo = Math.floor(bin), weight = bin - lo;
  if (frame < 0 || frame >= spec.frames || lo < 0 || lo + 1 >= spec.bins) return;
  return spec.sal[frame * spec.bins + lo] * (1 - weight) + spec.sal[frame * spec.bins + lo + 1] * weight;
}

/** Sweep rest frequency; relative event timing is never shifted independently. */
export function scoreCurve(curve: CurvePoint[], ridge: { t: number; f: number }[], f0: number, startUnix: number, clockOffset: number, spec?: Spectrogram) {
  let best = Infinity, bestFrequency = f0, bestCoverage = 0;
  const stride = Math.max(1, Math.floor(ridge.length / 100));
  for (let sweep = -8; sweep <= 8; sweep++) {
    const fundamental = f0 * (1 + sweep * 0.005);
    let loss = 0, used = 0, total = 0;
    for (let i = 0; i < ridge.length; i += stride) {
      total++;
      const point = ridge[i], ratio = ratioAt(curve, startUnix + point.t + clockOffset);
      if (ratio === undefined) { loss += 12; continue; }
      const prediction = ratio * fundamental;
      const residual = (prediction - point.f) / Math.max(1, point.f * 0.01);
      // Ridge distance prevents stationary noise from winning solely on brightness.
      loss += Math.min(12, residual * residual);
      if (spec) {
        const brightness = saliencyAt(spec, point.t, prediction);
        const measured = saliencyAt(spec, point.t, point.f);
        if (brightness !== undefined && measured !== undefined) loss += Math.max(0, Math.min(6, measured - brightness)) * 0.3;
      }
      used++;
    }
    const cost = total ? loss / total : Infinity;
    if (cost < best) { best = cost; bestFrequency = fundamental; bestCoverage = total ? used / total : 0; }
  }
  return { cost: best, frequency: bestFrequency, coverage: bestCoverage };
}