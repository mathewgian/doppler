import { broadenSpectrogram, detectEvents } from "./events";
import type { DopplerEvent } from "./geo";
import type { Spectrogram } from "./spectrogram";

/** Short fits can disagree on geometry even when their normalized measured curves coincide. */
function sameShortCurve(a: DopplerEvent, b: DopplerEvent) {
  if (!a.uncertain || !b.uncertain) return false;
  const overlap = Math.min(a.end, b.end) - Math.max(a.start, b.start);
  if (overlap < 0.7 * Math.min(a.end - a.start, b.end - b.start)) return false;
  const ratios: number[] = [];
  for (const p of a.track) {
    const q = b.track.find(x => Math.abs(x.t - p.t) < 0.01);
    if (!q) continue;
    ratios.push(Math.log(p.f / q.f));
  }
  if (ratios.length < 8) return false;
  const mean = ratios.reduce((s, x) => s + x, 0) / ratios.length;
  return Math.sqrt(ratios.reduce((s, x) => s + (x - mean) ** 2, 0) / ratios.length) < 0.02;
}

/** Bound ridge-tracer memory on long recordings; overlap preserves whole flyovers. */
export function detectLongEvents(spec: Spectrogram): DopplerEvent[] {
  const events: DopplerEvent[] = [];
  const frames = Math.ceil(120 * spec.rate / spec.hop), stride = Math.ceil(90 * spec.rate / spec.hop);
  for (let start = 0; start < spec.frames; start += stride) {
    const count = Math.min(frames, spec.frames - start);
    if (count < 8) continue;
    const offset = start * spec.hop / spec.rate;
    const part = { ...spec, frames: count, db: spec.db.subarray(start * spec.bins, (start + count) * spec.bins), sal: spec.sal.subarray(start * spec.bins, (start + count) * spec.bins), frameTime: (i: number) => spec.frameTime(i) };
    const tonal = detectEvents(part);
    const broadened = detectEvents(broadenSpectrogram(part), { mode: "broadened" });
    // Pooling can rediscover a tonal ridge; do not count it as another aircraft.
    const combined = [...tonal, ...broadened.filter(e => !tonal.some(x =>
      Math.abs(x.tCpa - e.tCpa) < 4 && Math.abs(Math.log(x.f0 / e.f0)) < 0.08))];
    for (const e of combined.filter(e => e.coversCpa)) {
      const event = { ...e, tCpa: e.tCpa + offset, start: e.start + offset, end: e.end + offset, track: e.track.map(p => ({ ...p, t: p.t + offset })) };
      const duplicate = events.findIndex(x => sameShortCurve(x, event) || (Math.abs(x.tCpa - event.tCpa) < 4 && Math.abs(Math.log(x.speed / event.speed)) < 0.12 && Math.abs(Math.log(x.slant / event.slant)) < 0.35));
      if (duplicate < 0) events.push(event);
      else {
        const previous = events[duplicate];
        const preferTonal = previous.spectralMode === "tonal" && event.spectralMode === "broadened";
        if (!preferTonal && event.rms < previous.rms) events[duplicate] = event;
      }
    }
  }
  return events.sort((a, b) => a.tCpa - b.tCpa).map((e, i) => ({ ...e, id: i + 1 }));
}