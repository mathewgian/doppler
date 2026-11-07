import type { DopplerEvent } from "./geo";
import { fitDoppler } from "./doppler";
import type { Spectrogram } from "./spectrogram";

export interface DetectOptions { threshold?: number; maxJumpBins?: number; minDuration?: number; maxEvents?: number }

/**
 * Finds gliding tonal ridges (engine tones sliding in pitch) with a Viterbi ridge tracer,
 * then fits each one with the flyover Doppler model.
 */
export function detectEvents(spec: Spectrogram, opts: DetectOptions = {}): DopplerEvent[] {
  const thr = opts.threshold ?? 3, J = opts.maxJumpBins ?? 5, lambda = 0.1;
  const minDur = opts.minDuration ?? 6, maxEvents = opts.maxEvents ?? 4;
  const { frames: T, bins: B, sal, db } = spec;
  const dt = spec.hop / spec.rate;
  const blocked = new Uint8Array(T * B);
  const K = 2 * J + 1, lambda2 = 0.6;
  // state = (bin, slope); penalising slope changes keeps the tracer on one smooth curve when two tones cross
  let prev = new Float32Array(B * K), cur = new Float32Array(B * K);
  const back = new Int8Array(T * B * K);
  const events: DopplerEvent[] = [];

  for (let attempt = 0; attempt < maxEvents * 2 && events.length < maxEvents; attempt++) {
    let bestScore = -Infinity, bt = 0, bb = 0, bd = 0;
    prev.fill(0);
    for (let t = 0; t < T; t++) {
      for (let b = 0; b < B; b++) {
        const i = t * B + b;
        const val = blocked[i] ? -3 - thr : Math.max(sal[i], -3) - thr;
        for (let d = -J; d <= 1; d++) { // flyover tones only fall in pitch
          const pb = b - d;
          let best = 0, arg = -128;
          if (t > 0 && pb >= 0 && pb < B) {
            const base = pb * K, jump = lambda * Math.abs(d);
            for (let e = 0; e <= J + 1; e++) {
              const sc = prev[base + e] - jump - lambda2 * Math.abs(d - (e - J));
              if (sc > best) { best = sc; arg = e; }
            }
          }
          const sc = val + best, k = b * K + d + J;
          cur[k] = sc; back[i * K + d + J] = arg;
          if (sc > bestScore) { bestScore = sc; bt = t; bb = b; bd = d; }
        }
      }
      const sw = prev; prev = cur; cur = sw;
    }
    const path: number[] = [];
    let t = bt, b = bb, d = bd;
    for (;;) {
      path.push(b);
      const a = back[(t * B + b) * K + d + J];
      if (a === -128 || t === 0) break;
      b -= d; d = a - J; t -= 1;
    }
    path.reverse();
    const pStart = bt - path.length + 1;
    // always block this ridge so the search moves on
    for (let k = 0; k < path.length; k++) for (let dd = -5; dd <= 5; dd++) { const bn = path[k] + dd; if (bn >= 0 && bn < B) blocked[(pStart + k) * B + bn] = 1; }
    if (bestScore < 30) break;
    // the tracer may bridge two different tones through noise: split at gaps and keep the strongest piece
    let pieceA = 0, pieceB = -1, bestSum = -Infinity, curA = 0, gap = 0, sumCur = 0;
    for (let k = 0; k <= path.length; k++) {
      const z = k < path.length ? sal[(pStart + k) * B + path[k]] : -Infinity;
      if (z < thr) gap++; else { if (gap >= 3) { curA = k; sumCur = 0; } gap = 0; }
      if (z >= thr) { sumCur += z; if (sumCur > bestSum) { bestSum = sumCur; pieceA = curA; pieceB = k; } }
    }
    if (pieceB < 0) continue;
    const t0 = pStart + pieceA;
    const seg = path.slice(pieceA, pieceB + 1);
    const dur = seg.length * dt;
    let sum = 0; for (let k = 0; k < seg.length; k++) sum += Math.max(sal[(t0 + k) * B + seg[k]], 0);
    const meanSal = sum / seg.length;
    if (dur < minDur || meanSal < thr + 1) continue;

    const tt: number[] = [], ff: number[] = [];
    for (let k = 0; k < seg.length; k++) {
      const fr = t0 + k, bn = seg[k];
      let off = 0;
      if (bn > 0 && bn < B - 1) {
        const a = db[fr * B + bn - 1], m = db[fr * B + bn], c = db[fr * B + bn + 1];
        const den = a - 2 * m + c; if (den < 0) off = Math.max(-0.5, Math.min(0.5, (0.5 * (a - c)) / den));
      }
      tt.push(spec.frameTime(fr)); ff.push(spec.fLow + (bn + off) * spec.df);
    }
    const k5 = Math.max(1, Math.floor(tt.length * 0.1));
    const head = ff.slice(0, k5).reduce((a, x) => a + x, 0) / k5, tail = ff.slice(-k5).reduce((a, x) => a + x, 0) / k5;
    if (head < tail * 1.02) continue; // no falling pitch: not a Doppler flyover
    const fit = fitDoppler(tt, ff);
    const tStart = tt[0], tEnd = tt[tt.length - 1];
    if (fit.rms > 0.04) continue;
    const span = tEnd - tStart;
    const coversCpa = fit.tCpa > tStart + 0.15 * span && fit.tCpa < tEnd - 0.15 * span && !fit.atLimit;
    const ev: DopplerEvent = {
      id: 0, tCpa: fit.tCpa, f0: fit.f0, speed: fit.speed, slant: fit.slant, rms: fit.rms, start: tStart, end: tEnd, coversCpa, snr: meanSal,
      sigmaLogD: coversCpa ? 0.2 : 0.45, sigmaLogV: coversCpa ? 0.1 : 0.22, track: tt.map((x, i) => ({ t: x, f: ff[i] })),
    };
    // harmonics of one engine share timing and geometry: keep only the cleanest
    const dup = events.findIndex(e => Math.abs(e.tCpa - ev.tCpa) < 4 && Math.abs(Math.log(e.speed / ev.speed)) < 0.12 && Math.abs(Math.log(e.slant / ev.slant)) < 0.35);
    if (dup >= 0) { if (ev.rms < events[dup].rms) events[dup] = ev; continue; }
    events.push(ev);
  }
  events.sort((a, b) => a.tCpa - b.tCpa);
  events.forEach((e, i) => { e.id = i + 1; });
  return events;
}
