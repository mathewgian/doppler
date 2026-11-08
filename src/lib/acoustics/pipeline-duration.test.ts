import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
import { analyzeRecording } from "./pipeline";

function recording(duration: number) {
  vi.stubGlobal("window", { OfflineAudioContext: class {
    async decodeAudioData() {
      return { duration, length: Math.round(duration * 8000), sampleRate: 8000,
        numberOfChannels: 1, getChannelData: () => new Float32Array(Math.round(duration * 8000)) };
    }
  } });
  return new Blob([new Uint8Array(8)], { type: "audio/mpeg" });
}
const options = { startUnix: 1700000000, clockSigma: 5, onStage: vi.fn() };
afterEach(() => vi.unstubAllGlobals());
describe("five-second recording minimum", () => {
  it("accepts exactly five seconds and processes it without inventing detections", async () => {
    const report = await analyzeRecording(recording(5), options);
    expect(report.duration).toBe(5);
    expect(report.status).toBe("no-events");
    expect(report.spectrogram.frames).toBeGreaterThan(8);
    expect(report.spectrogram.fLow).toBeGreaterThanOrEqual(5);
    expect(report.spectrogram.fLow - report.spectrogram.df).toBeLessThan(5);
    const lastFrequency = report.spectrogram.fLow + (report.spectrogram.bins - 1) * report.spectrogram.df;
    expect(lastFrequency).toBeLessThanOrEqual(800);
    expect(lastFrequency + report.spectrogram.df).toBeGreaterThan(800);
  });
  it("rejects recordings shorter than five seconds", async () => {
    await expect(analyzeRecording(recording(4.99), options)).rejects.toThrow("at least 5 seconds");
  });
  it("accepts a recording spanning the example's 920-second separation", async () => {
    const report = await analyzeRecording(recording(960), options);
    expect(report.duration).toBe(960);
    expect(report.events).toHaveLength(0);
  });
  it("rejects recordings beyond the bounded 30-minute search", async () => {
    await expect(analyzeRecording(recording(1801), options)).rejects.toThrow("30 minutes");
  });
});