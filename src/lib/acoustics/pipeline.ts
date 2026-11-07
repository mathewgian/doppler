import { FunctionsHttpError } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { detectEvents } from "./events";
import { REGION, type DopplerEvent, type FlightTrack } from "./geo";
import { locate, toObserved, type LocateResult } from "./locate";
import { computeSpectrogram, type Spectrogram } from "./spectrogram";

export type Stage = "decode" | "listen" | "flights" | "search";
export const STAGE_LABELS: Record<Stage, string> = {
  decode: "Reading the recording",
  listen: "Listening for aircraft Doppler curves",
  flights: "Fetching flight positions from OpenSky",
  search: "Testing every 200 m across Metro Vancouver",
};

export interface AnalysisReport {
  status: "located" | "no-events" | "no-match";
  duration: number;
  startUnix: number;
  clockSigma: number;
  spectrogram: Spectrogram;
  events: DopplerEvent[];
  flights: number;
  result?: LocateResult;
}

export class AnalysisError extends Error {}

async function decodeToMono(blob: Blob) {
  const buf = await blob.arrayBuffer();
  const Ctx = window.OfflineAudioContext || (window as unknown as { webkitOfflineAudioContext: typeof OfflineAudioContext }).webkitOfflineAudioContext;
  const ctx = new Ctx(1, 1, 8000); // decoding resamples (with anti-aliasing) to 8 kHz
  let audio: AudioBuffer;
  try { audio = await ctx.decodeAudioData(buf); } catch { throw new AnalysisError("This audio format couldn't be read by your browser. Try a WAV, MP3 or M4A file."); }
  const len = Math.floor(audio.length / 2);
  const out = new Float32Array(len);
  for (let c = 0; c < audio.numberOfChannels; c++) {
    const d = audio.getChannelData(c);
    for (let i = 0; i < len; i++) out[i] += (d[2 * i] + d[2 * i + 1]) / (2 * audio.numberOfChannels);
  }
  return { samples: out, rate: audio.sampleRate / 2, duration: audio.duration };
}

async function fetchFlights(begin: number, end: number): Promise<FlightTrack[]> {
  const pad = 0.12;
  const { data, error } = await supabase.functions.invoke("opensky-flights", {
    body: { begin: Math.floor(begin), end: Math.ceil(end), bbox: { lamin: REGION.latMin - pad, lamax: REGION.latMax + pad, lomin: REGION.lonMin - pad * 1.5, lomax: REGION.lonMax + pad * 1.5 } },
  });
  if (error) {
    let msg = "Flight data is unavailable right now.";
    if (error instanceof FunctionsHttpError) { try { msg = (await error.context.json()).error ?? msg; } catch { /* keep default */ } }
    throw new AnalysisError(msg);
  }
  return data.tracks as FlightTrack[];
}

export async function analyzeRecording(blob: Blob, opts: { startUnix: number; clockSigma: number; onStage: (s: Stage, progress?: number) => void }): Promise<AnalysisReport> {
  const tick = () => new Promise(r => setTimeout(r, 30));
  opts.onStage("decode"); await tick();
  const { samples, rate, duration } = await decodeToMono(blob);
  if (duration < 12) throw new AnalysisError("The recording needs to be at least 12 seconds long to capture a flyover.");
  if (duration > 600) throw new AnalysisError("Please trim the recording to 10 minutes or less around the aircraft sound.");

  opts.onStage("listen"); await tick();
  const spectrogram = computeSpectrogram(samples, rate);
  const events = detectEvents(spectrogram);
  const base = { duration, startUnix: opts.startUnix, clockSigma: opts.clockSigma, spectrogram, events };
  if (!events.length) return { ...base, status: "no-events", flights: 0 };

  opts.onStage("flights");
  const obs = toObserved(events, opts.startUnix);
  const tMin = Math.min(...obs.map(e => e.tAbs)), tMax = Math.max(...obs.map(e => e.tAbs));
  const flights = await fetchFlights(tMin - opts.clockSigma - 60, tMax + opts.clockSigma + 60);

  opts.onStage("search", 0);
  const result = await locate(obs, flights, { clockSigma: opts.clockSigma, clipStart: opts.startUnix, clipEnd: opts.startUnix + duration, onProgress: p => opts.onStage("search", p) });
  return { ...base, status: result.candidates.length ? "located" : "no-match", flights: flights.length, result };
}
