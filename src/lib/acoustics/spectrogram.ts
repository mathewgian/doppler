export function fftInPlace(re: Float64Array, im: Float64Array) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { const a = re[i]; re[i] = re[j]; re[j] = a; const b = im[i]; im[i] = im[j]; im[j] = b; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang), half = len >> 1;
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < half; k++) {
        const a = i + k, b = a + half;
        const vr = re[b] * cr - im[b] * ci, vi = re[b] * ci + im[b] * cr;
        re[b] = re[a] - vr; im[b] = im[a] - vi; re[a] += vr; im[a] += vi;
        const nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
      }
    }
  }
}

export interface Spectrogram {
  rate: number; n: number; hop: number; df: number; fLow: number;
  bins: number; frames: number;
  /** raw level in dB, frames*bins */
  db: Float32Array;
  /** robust z-score of each cell against its own frequency's background, frames*bins */
  sal: Float32Array;
  frameTime: (i: number) => number;
}

export function computeSpectrogram(x: Float32Array, rate: number, opts: { n?: number; hop?: number; fLow?: number; fHigh?: number } = {}): Spectrogram {
  const n = opts.n ?? 2048, hop = opts.hop ?? 1024, fLow = opts.fLow ?? 5, fHigh = opts.fHigh ?? 800;
  const df = rate / n;
  const b0 = Math.ceil(fLow / df), b1 = Math.min(n / 2 - 1, Math.floor(fHigh / df));
  const bins = b1 - b0 + 1;
  const frames = Math.floor((x.length - n) / hop) + 1;
  if (frames < 8) throw new Error("Recording is too short to analyse.");
  const win = new Float64Array(n);
  for (let i = 0; i < n; i++) win[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1));
  const db = new Float32Array(frames * bins);
  const re = new Float64Array(n), im = new Float64Array(n);
  for (let f = 0; f < frames; f++) {
    const off = f * hop;
    for (let i = 0; i < n; i++) { re[i] = x[off + i] * win[i]; im[i] = 0; }
    fftInPlace(re, im);
    for (let b = 0; b < bins; b++) { const k = b + b0; db[f * bins + b] = 10 * Math.log10(re[k] * re[k] + im[k] * im[k] + 1e-12); }
  }
  const sal = new Float32Array(frames * bins);
  const col = new Float32Array(frames);
  for (let b = 0; b < bins; b++) {
    for (let f = 0; f < frames; f++) col[f] = db[f * bins + b];
    // 20th percentile: steady tones can occupy a bin for most of the clip, so the median is not a safe background
    const floor = Float32Array.from(col).sort()[Math.floor(frames * 0.2)];
    const scale = 5.6; // spread (dB) of a noise-only spectrogram cell
    for (let f = 0; f < frames; f++) sal[f * bins + b] = (db[f * bins + b] - floor) / scale;
  }
  return { rate, n, hop, df, fLow: b0 * df, bins, frames, db, sal, frameTime: i => (i * hop + n / 2) / rate };
}
