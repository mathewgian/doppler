import { describe, expect, it } from "vitest";
import { dopplerFreq } from "./doppler";
import { broadenSpectrogram, detectionRules } from "./events";
import { detectLongEvents } from "./long-events";
import { computeSpectrogram } from "./spectrogram";

const rate = 4000;
function clip(seconds: number, tones: number[] = [], broadened = false, distinct = false) {
  const samples = new Float32Array(seconds * rate);
  let seed = 42;
  const phases = tones.flatMap(f => broadened ? [f - 3, f, f + 3] : [f]).map(f0 => ({ f0, phase: 0 }));
  for (let i = 0; i < samples.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    samples[i] = (seed / 4294967296 - 0.5) * 0.015;
    for (const [index, tone] of phases.entries()) {
      tone.phase += 2 * Math.PI * dopplerFreq(i / rate - seconds / 2 + (distinct ? index : 0), tone.f0, distinct && index ? 80 : 130, distinct && index ? 450 : 220) / rate;
      samples[i] += 0.2 * Math.sin(tone.phase);
    }
  }
  return computeSpectrogram(samples, rate);
}

describe("short and overlapping aircraft evidence", () => {
  it("detects a complete five-second Doppler pass with conservative uncertainty", () => {
    const events = detectLongEvents(clip(5, [220]));
    expect(events.length).toBeGreaterThan(0);
    expect(events[0].coversCpa).toBe(true);
    expect(events[0].uncertain).toBe(true);
    expect(Math.abs(events[0].tCpa - 2.5)).toBeLessThan(0.6);
  });
  it("uses fewer required frames for five-second than twelve-second recordings", () => {
    const short = detectionRules(clip(5)), longer = detectionRules(clip(12));
    expect(short.minScore).toBeLessThan(longer.minScore);
    expect(short.minDuration).toBe(2.5);
    expect(longer.threshold).toBe(3);
  });
  it("does not count identical simultaneous normalized curves as independent aircraft", () => {
    const events = detectLongEvents(clip(10, [170, 330]));
    expect(events.length).toBeGreaterThan(0);
    // The two tones have identical geometry and must be treated as harmonics,
    // not invented independent aircraft evidence.
    expect(events.length).toBe(1);
  });
  it("retains overlapping aircraft bands with different timing and geometry", () => {
    const events = detectLongEvents(clip(10, [140, 260], false, true));
    expect(events.length).toBeGreaterThanOrEqual(2);
    expect(events.some(e => Math.abs(e.tCpa - 5) < 0.7)).toBe(true);
    expect(events.some(e => Math.abs(e.tCpa - 4) < 0.7)).toBe(true);
  });
  it("tracks a locally broadened five-second pass", () => {
    expect(detectLongEvents(clip(5, [240], true)).length).toBeGreaterThan(0);
  });
  it("does not turn five-second noise into an aircraft event", () => {
    expect(detectLongEvents(clip(5))).toHaveLength(0);
  });
  it("does not turn a fixed tone into a falling Doppler curve", () => {
    const samples = Float32Array.from({ length: rate * 5 }, (_, i) => Math.sin(2 * Math.PI * 220 * i / rate));
    expect(detectLongEvents(computeSpectrogram(samples, rate))).toHaveLength(0);
  });
  it("frequency pooling is bounded and leaves the original spectrogram untouched", () => {
    const spec = clip(5, [220]);
    const first = spec.sal[0];
    const pooled = broadenSpectrogram(spec);
    expect(pooled.sal).not.toBe(spec.sal);
    expect(pooled.sal.length).toBe(spec.frames * spec.bins);
    expect(spec.sal[0]).toBe(first);
    expect(pooled.db).toBe(spec.db);
  });
});