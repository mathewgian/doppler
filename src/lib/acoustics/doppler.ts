import { SPEED_OF_SOUND as C } from "./geo";

/**
 * Frequency heard from a source moving in a straight line at speed v whose closest approach
 * is d. `s` is the reception time since the sound emitted at closest approach arrived.
 * Uses emission-time (retarded) geometry, not the simple "instant" approximation.
 */
export function dopplerFreq(s: number, f0: number, v: number, d: number) {
  let tau = s;
  for (let i = 0; i < 8; i++) {
    const r = Math.sqrt(d * d + v * v * tau * tau);
    const g = tau + (r - d) / C - s;
    tau -= g / (1 + (v * v * tau) / (C * r));
  }
  const x = v * tau;
  const r = Math.sqrt(d * d + x * x);
  return f0 / (1 + (v * x) / (r * C));
}

export function nelderMead(fn: (p: number[]) => number, start: number[], step: number[], iters = 200) {
  const n = start.length;
  let pts = [start.slice()];
  for (let i = 0; i < n; i++) { const p = start.slice(); p[i] += step[i]; pts.push(p); }
  let vals = pts.map(fn);
  for (let it = 0; it < iters; it++) {
    const order = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
    pts = order.map(i => pts[i]); vals = order.map(i => vals[i]);
    const cen = new Array(n).fill(0);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cen[j] += pts[i][j] / n;
    const along = (k: number) => cen.map((c, j) => c + k * (pts[n][j] - c));
    const refl = along(-1); const fr = fn(refl);
    if (fr < vals[0]) {
      const exp = along(-2); const fe = fn(exp);
      if (fe < fr) { pts[n] = exp; vals[n] = fe; } else { pts[n] = refl; vals[n] = fr; }
    } else if (fr < vals[n - 1]) { pts[n] = refl; vals[n] = fr; }
    else {
      const con = along(fr < vals[n] ? -0.5 : 0.5); const fc = fn(con);
      if (fc < Math.min(fr, vals[n])) { pts[n] = con; vals[n] = fc; }
      else for (let i = 1; i <= n; i++) { pts[i] = pts[0].map((x, j) => x + 0.5 * (pts[i][j] - x)); vals[i] = fn(pts[i]); }
    }
  }
  let b = 0; for (let i = 1; i <= n; i++) if (vals[i] < vals[b]) b = i;
  return { p: pts[b], value: vals[b] };
}

export interface DopplerFit { tCpa: number; f0: number; speed: number; slant: number; rms: number; atLimit: boolean }

const V_MIN = 35, V_MAX = 300, D_MIN = 40, D_MAX = 9000;

/** Fit the four-parameter flyover model to a measured frequency track. */
export function fitDoppler(t: number[], f: number[]): DopplerFit {
  const n = t.length;
  const fMed = [...f].sort((a, b) => a - b)[Math.floor(n / 2)];
  const mid = (f[0] + f[n - 1]) / 2;
  let t0 = t[Math.floor(n / 2)];
  for (let i = 1; i < n; i++) if ((f[i - 1] - mid) * (f[i] - mid) <= 0) { t0 = t[i]; break; }
  const cost = (p: number[]) => {
    const [tc, lf, lv, ld] = p;
    const v = Math.exp(lv), d = Math.exp(ld);
    let pen = 0;
    if (v < V_MIN) pen += (V_MIN - v) ** 2 * 1e-2; if (v > V_MAX) pen += (v - V_MAX) ** 2 * 1e-2;
    if (d < D_MIN) pen += (D_MIN - d) ** 2 * 1e-4; if (d > D_MAX) pen += (d - D_MAX) ** 2 * 1e-6;
    const vc = Math.min(V_MAX, Math.max(V_MIN, v)), dc = Math.min(D_MAX, Math.max(D_MIN, d));
    let s = 0;
    for (let i = 0; i < n; i++) {
      const e = (f[i] - dopplerFreq(t[i] - tc, Math.exp(lf), vc, dc)) / fMed / 0.01;
      s += Math.log(1 + e * e);
    }
    return s / n + pen;
  };
  let best = { p: [t0, Math.log(mid), Math.log(120), Math.log(800)], value: Infinity };
  for (const v of [60, 110, 170, 240]) for (const d of [200, 700, 2000]) {
    const r = nelderMead(cost, [t0, Math.log(mid), Math.log(v), Math.log(d)], [(t[n - 1] - t[0]) * 0.1, 0.05, 0.2, 0.3], 160);
    if (r.value < best.value) best = r;
  }
  best = nelderMead(cost, best.p, [0.5, 0.01, 0.05, 0.05], 200);
  const [tc, lf, lv, ld] = best.p;
  const speed = Math.exp(lv), slant = Math.exp(ld);
  let rs = 0;
  for (let i = 0; i < n; i++) rs += ((f[i] - dopplerFreq(t[i] - tc, Math.exp(lf), speed, slant)) / fMed) ** 2;
  return { tCpa: tc, f0: Math.exp(lf), speed, slant, rms: Math.sqrt(rs / n), atLimit: speed < V_MIN * 1.02 || speed > V_MAX * 0.98 || slant < D_MIN * 1.05 || slant > D_MAX * 0.95 };
}
