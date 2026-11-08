import { detectEvents } from "./events";
import type { DopplerEvent } from "./geo";
import type { Spectrogram } from "./spectrogram";

/** Bound ridge-tracer memory on long recordings; overlap preserves whole flyovers. */
export function detectLongEvents(spec: Spectrogram): DopplerEvent[] {
  const events: DopplerEvent[] = [];
  const frames = Math.ceil(120 * spec.rate / spec.hop), stride = Math.ceil(90 * spec.rate / spec.hop);
  for (let start = 0; start < spec.frames; start += stride) {
    const count = Math.min(frames, spec.frames - start);
    if (count < 8) continue;
    const offset = start * spec.hop / spec.rate;
    const part = { ...spec, frames: count, db: spec.db.subarray(start * spec.bins, (start + count) * spec.bins), sal: spec.sal.subarray(start * spec.bins, (start + count) * spec.bins), frameTime: (i: number) => spec.frameTime(i) };
    for (const e of detectEvents(part, { minDuration: 4 }).filter(e => e.coversCpa)) {
      const event = { ...e, tCpa: e.tCpa + offset, start: e.start + offset, end: e.end + offset, track: e.track.map(p => ({ ...p, t: p.t + offset })) };
      const duplicate = events.findIndex(x => Math.abs(x.tCpa - event.tCpa) < 4 && Math.abs(Math.log(x.speed / event.speed)) < 0.12);
      if (duplicate < 0) events.push(event); else if (event.rms < events[duplicate].rms) events[duplicate] = event;
    }
  }
  return events.sort((a, b) => a.tCpa - b.tCpa).map((e, i) => ({ ...e, id: i + 1 }));
}