import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { detectLongEvents } from "./long-events";
import { bandEnvelope, locateByArrival } from "./arrival";
import { loadTerrain, terrainElevation, TERRAIN_ATTRIBUTION } from "./terrain";
import { archiveWindows, CLOCK_WINDOWS, MAX_RECORDING_SECONDS, MAX_SEARCH_POSITIONS } from "./search-rules";
import { REGION, type DopplerEvent, type FlightTrack } from "./geo";
import { locate, toObserved, type LocateResult } from "./locate";
import { computeSpectrogram, type Spectrogram } from "./spectrogram";
import { z } from "zod";

export type Stage = "decode" | "listen" | "flights" | "terrain" | "search";
export const STAGE_LABELS: Record<Stage, string> = {
  decode: "Reading the recording",
  listen: "Listening for aircraft Doppler curves",
  flights: "Checking historical ADSB.lol aircraft positions",
  terrain: "Loading Metro Vancouver terrain elevations",
  search: "Comparing flight curves and refining candidate areas",
};

export interface AnalysisReport {
  status: "located" | "no-events" | "no-match";
  /** "doppler": matched tonal flyover curves. "arrival": matched broadband jet-roar arrival (no clean curve). */
  method?: "doppler" | "arrival";
  duration: number;
  startUnix: number;
  clockSigma: number;
  spectrogram: Spectrogram;
  events: DopplerEvent[];
  flights: number;
  result?: LocateResult;
  terrainAttribution?: string;
  archive?: { source: string; days: string[]; rows: number; complete: boolean; attribution: string; archiveUrls: string[] };
}

export class AnalysisError extends Error {}

async function decodeToMono(blob: Blob) {
  const buf = await blob.arrayBuffer();
  const Ctx = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new Ctx(1, 1, 16000); // decoding resamples (with anti-aliasing) to 16 kHz
  let audio: AudioBuffer;
  try { audio = await ctx.decodeAudioData(buf); } catch { throw new AnalysisError("This audio format couldn't be read by your browser. Try a WAV, MP3 or M4A file."); }
  const wide = new Float32Array(audio.length);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < wide.length; i++) wide[i] += d[i] / audio.numberOfChannels;
  }
  // 4 kHz stream for the 5–800 Hz Doppler tracker; the 16 kHz stream keeps high-frequency jet roar.
  return { samples: decimate4(wide), rate: audio.sampleRate / 4, wide, wideRate: audio.sampleRate, duration: audio.duration };
}

/** Windowed-sinc low-pass (cutoff 0.1 × rate) then keep every 4th sample, so jet roar cannot alias below 800 Hz. */
export function decimate4(x: Float32Array) {
  const taps = 63, half = (taps - 1) / 2, fc = 0.1;
  const h = new Float64Array(taps);
  let sum = 0;
  for (let i = 0; i < taps; i++) {
    const k = i - half;
    const sinc = k === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * k) / (Math.PI * k);
    h[i] = sinc * (0.42 - 0.5 * Math.cos((2 * Math.PI * i) / (taps - 1)) + 0.08 * Math.cos((4 * Math.PI * i) / (taps - 1)));
    sum += h[i];
  }
  const len = Math.floor(x.length / 4), out = new Float32Array(len);
  for (let j = 0; j < len; j++) {
    let acc = 0;
    for (let i = 0; i < taps; i++) { const n = 4 * j + i - half; if (n >= 0 && n < x.length) acc += h[i] * x[n]; }
    out[j] = acc / sum;
  }
  return out;
}

const archiveSchema = z.object({
  tracks: z.array(z.object({ icao24: z.string(), callsign: z.string(), samples: z.array(z.object({
    t: z.number().finite(), lat: z.number().min(REGION.latMin).max(REGION.latMax),
    lon: z.number().min(REGION.lonMin).max(REGION.lonMax), alt: z.number().positive().max(20000),
  })) })),
  meta: z.object({ source: z.string(), days: z.array(z.string()), rows: z.number(), complete: z.literal(true), attribution: z.string(), archiveUrls: z.array(z.string()) }),
});
async function fetchFlights(begin: number, end: number) {
  const { data, error } = await supabase.functions.invoke("archive-flights", {
    body: { begin: Math.floor(begin), end: Math.ceil(end) },
  });
  if (error) {
    let msg = "Flight data is unavailable right now.";
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep default */ } }
    throw new AnalysisError(msg);
  }
  const parsed = archiveSchema.safeParse(data);
  if (!parsed.success) throw new AnalysisError("Historical aircraft data could not be validated.");
  // This project disables strictNullChecks, making Zod's inferred fields optional.
  // Runtime validation above establishes the concrete response contract.
  return parsed.data as { tracks: FlightTrack[]; meta: NonNullable<AnalysisReport["archive"]> };
}

export async function analyzeRecording(blob: Blob, opts: { startUnix: number; clockSigma: number; onStage: (s: Stage, progress?: number) => void }): Promise<AnalysisReport> {
  if (!Number.isFinite(opts.startUnix) || opts.startUnix <= 0 || opts.startUnix > Date.now() / 1000 || !CLOCK_WINDOWS.includes(opts.clockSigma)) throw new AnalysisError("Check the recording start time and time accuracy.");
  if (blob.size > 50 * 1024 * 1024) throw new AnalysisError("Choose an audio file smaller than 50 MB.");
  const tick = () => new Promise(r => setTimeout(r, 30));
  opts.onStage("decode"); await tick();
  const { samples, rate, wide, wideRate, duration } = await decodeToMono(blob);
  if (duration < 5) throw new AnalysisError("The recording needs to be at least 5 seconds long.");
  if (duration > MAX_RECORDING_SECONDS) throw new AnalysisError("Please trim the recording to 30 minutes or less around the aircraft sounds.");

  opts.onStage("listen"); await tick();
  const spectrogram = computeSpectrogram(samples, rate);
  const events = detectLongEvents(spectrogram);
  const envelope = duration <= 600 ? bandEnvelope(wide, wideRate) : null;
  const base = { duration, startUnix: opts.startUnix, clockSigma: opts.clockSigma, spectrogram, events };
  const arrivalPossible = !!envelope && envelope.riseDb >= 6;
  if (!events.length && !arrivalPossible) return { ...base, status: "no-events", flights: 0 };

  opts.onStage("flights");
  const obs = toObserved(events, opts.startUnix);
  const merged = new Map<string, FlightTrack>();
  let meta: AnalysisReport["archive"];
  // Include the entire measured ridges and intervening silence, not just CPA centers.
  const windows = archiveWindows(opts.startUnix - opts.clockSigma - 60, Math.min(Date.now() / 1000, opts.startUnix + duration + opts.clockSigma + 60));
  let rowCount = 0;
  for (const [begin, end] of windows) {
    const archive = await fetchFlights(begin, end);
    rowCount += archive.meta.rows;
    if (rowCount > MAX_SEARCH_POSITIONS) throw new AnalysisError("This search has too many aircraft positions. Use a more accurate recording time.");
    for (const track of archive.tracks) {
      const existing = merged.get(track.icao24);
      if (existing) existing.samples.push(...track.samples); else merged.set(track.icao24, track);
    }
    meta = { ...archive.meta, rows: rowCount, days: [...new Set([...(meta?.days ?? []), ...archive.meta.days])], archiveUrls: [...new Set([...(meta?.archiveUrls ?? []), ...archive.meta.archiveUrls])] };
  }
  const flights = [...merged.values()];
  opts.onStage("terrain");
  const terrain = await loadTerrain();

  opts.onStage("search", 0);
  const elevationAt = (lat: number, lon: number) => terrainElevation(terrain, lat, lon);
  const common = { ...base, flights: flights.length, archive: meta, terrainAttribution: TERRAIN_ATTRIBUTION };
  if (events.length) {
    const result = await locate(obs, flights, { clockSigma: opts.clockSigma, clipStart: opts.startUnix, clipEnd: opts.startUnix + duration, spectrogram, elevationAt, onProgress: p => opts.onStage("search", arrivalPossible ? p / 2 : p) });
    if (result.candidates.length || !arrivalPossible) return { ...common, status: result.candidates.length ? "located" : "no-match", method: "doppler", result };
  }
  // No clean Doppler curve (or none matched): try the broadband jet-roar arrival evidence.
  const arrival = await locateByArrival(envelope, flights, { clockSigma: opts.clockSigma, clipStart: opts.startUnix, elevationAt, onProgress: p => opts.onStage("search", events.length ? 0.5 + p / 2 : p) });
  return { ...common, status: arrival.candidates.length ? "located" : "no-match", method: "arrival", result: arrival };
}
