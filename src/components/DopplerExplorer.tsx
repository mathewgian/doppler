import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { dopplerFreq } from "@/lib/acoustics/doppler";
import { SPEED_OF_SOUND as C } from "@/lib/acoustics/geo";

const F0 = 500, T_SPAN = 8, PERIOD = 0.35;

const cssColor = (name: string, alpha = 1) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v ? `hsl(${v} / ${alpha})` : `rgba(255,255,255,${alpha})`;
};

/** What the microphone hears at plane-clock time t (the sound lags the plane by r/c). */
const heard = (t: number, v: number, d: number) => dopplerFreq(t - d / C, F0, v, d);

export default function DopplerExplorer() {
  const [lateral, setLateral] = useState(500);
  const [speed, setSpeed] = useState(145);
  const [playing, setPlaying] = useState(true);
  const [t, setT] = useState(-T_SPAN);
  const path = useRef<HTMLCanvasElement>(null);
  const curve = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!playing) return;
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      setT(prev => (prev + dt * 0.8 > T_SPAN ? -T_SPAN : prev + dt * 0.8));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const planeX = speed * t;
  const distance = Math.hypot(planeX, lateral);
  const freq = heard(t, speed, lateral);
  const maxRate = -(F0 * speed * speed) / (C * lateral);
  const fHigh = F0 / (1 - speed / C), fLow = F0 / (1 + speed / C);

  // top-down flight path with expanding sound rings
  useEffect(() => {
    const c = path.current; if (!c) return;
    const W = c.clientWidth * 2, H = c.clientHeight * 2;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const half = Math.max(1200, speed * T_SPAN) * 1.05;
    const lineY = H * 0.28;
    const scale = Math.min(W / (2 * half), (H - lineY - 50) / lateral);
    const X = (x: number) => W / 2 + x * scale;
    const Y = (y: number) => lineY + y * scale;
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = cssColor("--border"); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(-speed * T_SPAN), lineY); ctx.lineTo(X(speed * T_SPAN), lineY); ctx.stroke();
    // closest-approach guide
    ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(X(0), lineY); ctx.lineTo(X(0), Y(lateral)); ctx.stroke(); ctx.setLineDash([]);
    for (let te = Math.ceil(-T_SPAN / PERIOD) * PERIOD; te <= t; te += PERIOD) {
      const r = C * (t - te) * scale;
      if (r > W) continue;
      ctx.strokeStyle = cssColor("--foreground", Math.max(0.08, 0.55 - (t - te) * 0.045)); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(X(speed * te), lineY, r, 0, Math.PI * 2); ctx.stroke();
    }
    // line of sight
    ctx.strokeStyle = cssColor("--signal"); ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(planeX), lineY); ctx.lineTo(X(0), Y(lateral)); ctx.stroke(); ctx.setLineDash([]);
    // plane
    ctx.fillStyle = cssColor("--signal");
    ctx.beginPath(); ctx.moveTo(X(planeX) + 22, lineY); ctx.lineTo(X(planeX) - 14, lineY - 13); ctx.lineTo(X(planeX) - 6, lineY); ctx.lineTo(X(planeX) - 14, lineY + 13); ctx.closePath(); ctx.fill();
    // microphone
    ctx.fillStyle = cssColor("--foreground");
    ctx.beginPath(); ctx.arc(X(0), Y(lateral), 11, 0, Math.PI * 2); ctx.fill();
    ctx.font = "500 24px system-ui"; ctx.fillText("Microphone", X(0) + 20, Y(lateral) + 8);
    ctx.fillStyle = cssColor("--muted-foreground"); ctx.font = "22px monospace";
    ctx.fillText(`${lateral} m`, X(0) + 12, (lineY + Y(lateral)) / 2);
  }, [t, lateral, speed, planeX]);

  // observed frequency curve
  useEffect(() => {
    const c = curve.current; if (!c) return;
    const W = c.clientWidth * 2, H = c.clientHeight * 2;
    c.width = W; c.height = H;
    const ctx = c.getContext("2d"); if (!ctx) return;
    const L = 110, R = 30, T = 30, B = 60;
    const fTop = 800, fBot = 250;
    const X = (s: number) => L + ((s + T_SPAN) / (2 * T_SPAN)) * (W - L - R);
    const Y = (f: number) => T + ((fTop - f) / (fTop - fBot)) * (H - T - B);
    ctx.clearRect(0, 0, W, H);
    ctx.strokeStyle = cssColor("--border"); ctx.lineWidth = 2; ctx.strokeRect(L, T, W - L - R, H - T - B);
    ctx.fillStyle = cssColor("--muted-foreground"); ctx.font = "22px monospace";
    for (const f of [300, 500, 700]) {
      ctx.fillText(`${f}Hz`, 8, Y(f) + 7);
      ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(L, Y(f)); ctx.lineTo(W - R, Y(f)); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillText(`-${T_SPAN}s`, L - 20, H - 18); ctx.fillText("0s (overhead)", X(0) - 70, H - 18); ctx.fillText(`+${T_SPAN}s`, W - R - 50, H - 18);
    ctx.strokeStyle = cssColor("--foreground"); ctx.lineWidth = 4;
    ctx.beginPath();
    for (let k = 0; k <= 300; k++) { const s = -T_SPAN + (2 * T_SPAN * k) / 300; const y = Y(heard(s, speed, lateral)); k ? ctx.lineTo(X(s), y) : ctx.moveTo(X(s), y); }
    ctx.stroke();
    ctx.strokeStyle = cssColor("--signal"); ctx.lineWidth = 2; ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), H - B); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = cssColor("--signal"); ctx.beginPath(); ctx.arc(X(t), Y(freq), 11, 0, Math.PI * 2); ctx.fill();
  }, [t, lateral, speed, freq]);

  return <div className="doppler-explorer">
    <div className="explorer-top">
      <div><h3>Airplane Doppler Shift &amp; Slant Range</h3>
        <dl className="explorer-stats"><div><dt>Observed frequency</dt><dd>{Math.round(freq)} Hz</dd></div><div><dt>Distance to mic</dt><dd>{Math.round(distance)} m</dd></div><div><dt>Max shift rate</dt><dd>{maxRate.toFixed(1)} Hz/s</dd></div></dl>
      </div>
      <div className="explorer-buttons"><Button variant="outline" onClick={() => setPlaying(p => !p)}>{playing ? "Pause" : "Play"}</Button><Button variant="outline" onClick={() => { setT(-T_SPAN); setPlaying(true); }}>Reset</Button></div>
    </div>
    <div className="explorer-panel"><span className="panel-label">Top-down flight path</span><canvas ref={path} className="explorer-path" role="img" aria-label={`A plane at ${speed} metres per second passing ${lateral} metres from the microphone`} /></div>
    <div className="explorer-panel"><span className="panel-label">Observed frequency curve f(t)</span><canvas ref={curve} className="explorer-curve" role="img" aria-label="The pitch the microphone hears over time, falling as the plane passes" /></div>
    <div className="explorer-controls">
      <label><span>Closest distance to the plane</span><div><Slider min={100} max={1500} step={10} value={[lateral]} onValueChange={([v]) => setLateral(v)} aria-label="Closest distance" /><output>{lateral} m</output></div></label>
      <label><span>Plane speed</span><div><Slider min={50} max={260} step={5} value={[speed]} onValueChange={([v]) => setSpeed(v)} aria-label="Plane speed" /><output>{speed} m/s</output></div></label>
    </div>
    <div className="explorer-readout">
      <p><strong>Read the speed from the two flat ends.</strong> The pitch starts near {Math.round(fHigh)} Hz and settles near {Math.round(fLow)} Hz. How far apart they are gives the speed: v = c × (f<sub>high</sub> − f<sub>low</sub>) ÷ (f<sub>high</sub> + f<sub>low</sub>) ≈ {Math.round((C * (fHigh - fLow)) / (fHigh + fLow))} m/s.</p>
      <p><strong>Read the distance from the steepest drop.</strong> A close plane makes the pitch fall suddenly; a distant one makes it slide gently. Slant range = f₀ × v² ÷ (c × |steepest slope|) ≈ {Math.round((F0 * speed * speed) / (C * Math.abs(maxRate)))} m.</p>
    </div>
  </div>;
}
