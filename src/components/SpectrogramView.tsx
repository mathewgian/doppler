import { useEffect, useRef } from "react";
import { dopplerFreq } from "@/lib/acoustics/doppler";
import type { DopplerEvent } from "@/lib/acoustics/geo";
import type { Spectrogram } from "@/lib/acoustics/spectrogram";

/** Low-frequency spectrogram with each detected flyover's fitted Doppler curve drawn on top. */
export default function SpectrogramView({ spec, events }: { spec: Spectrogram; events: DopplerEvent[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const fMax = Math.min(spec.fLow + spec.bins * spec.df, Math.max(300, ...events.map(e => e.f0 * 1.6)));
  const binsShown = Math.min(spec.bins, Math.ceil((fMax - spec.fLow) / spec.df));
  const duration = spec.frameTime(spec.frames - 1);

  useEffect(() => {
    const c = canvas.current; if (!c) return;
    const W = 900, H = 260;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const img = ctx.createImageData(W, H);
    for (let px = 0; px < W; px++) {
      const fr = Math.min(spec.frames - 1, Math.floor((px / W) * spec.frames));
      for (let py = 0; py < H; py++) {
        const b = Math.floor(((H - 1 - py) / H) * binsShown);
        const z = spec.sal[fr * spec.bins + b];
        const v = Math.max(0, Math.min(1, (z - 0.5) / 6));
        const g = Math.round(14 + v * 225);
        const o = (py * W + px) * 4;
        img.data[o] = g; img.data[o + 1] = g; img.data[o + 2] = g; img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    const css = getComputedStyle(document.documentElement);
    ctx.strokeStyle = `hsl(${css.getPropertyValue("--signal").trim() || "0 0% 100%"})`;
    ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
    ctx.fillStyle = ctx.strokeStyle; ctx.font = "600 16px monospace";
    for (const e of events) {
      ctx.beginPath();
      for (let k = 0; k <= 120; k++) {
        const t = e.start + ((e.end - e.start) * k) / 120;
        const f = dopplerFreq(t - e.tCpa, e.f0, e.speed, e.slant);
        const x = (t / duration) * W, y = H - ((f - spec.fLow) / (binsShown * spec.df)) * H;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
      const lx = Math.min(W - 30, Math.max(6, (e.tCpa / duration) * W + 6));
      const ly = H - ((e.f0 - spec.fLow) / (binsShown * spec.df)) * H - 10;
      ctx.fillText(`#${e.id}`, lx, Math.max(18, ly));
    }
  }, [spec, events, binsShown, duration]);

  return <figure className="spectrogram">
    <canvas ref={canvas} role="img" aria-label={`Spectrogram up to ${Math.round(fMax)} Hz with ${events.length} detected flyover curves`} />
    <figcaption><span>0 s</span><span>{Math.round(spec.fLow)}–{Math.round(fMax)} Hz · dashed lines are the fitted flyover curves</span><span>{Math.round(duration)} s</span></figcaption>
  </figure>;
}
