import { describe, expect, it } from "vitest";
import { computeSpectrogram } from "./spectrogram";

describe("uploaded recording Doppler frequency band", () => {
  // A 4096 Hz rate gives exact 2 Hz bins, except for the lower boundary test,
  // which uses a 4096-point FFT to place a bin at exactly 5 Hz.
  it("includes 5 Hz and excludes frequencies below it", () => {
    const spec = computeSpectrogram(new Float32Array(4096 * 5), 4096, { n: 4096 });
    expect(spec.fLow).toBe(5);
    expect(spec.db.length).toBe(spec.frames * spec.bins);
  });

  it("includes 800 Hz and excludes frequencies above it", () => {
    const spec = computeSpectrogram(new Float32Array(4096 * 5), 4096);
    expect(spec.fLow + (spec.bins - 1) * spec.df).toBe(800);
    expect(spec.fLow + spec.bins * spec.df).toBeGreaterThan(800);
  });
});