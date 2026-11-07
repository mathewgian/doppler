import { useEffect, useState } from "react";
import { RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import HikerDemo from "./HikerDemo";
import RotatingGlobe from "./RotatingGlobe";
import SimulatedSearch from "./SimulatedSearch";
import { HIKER_DEMO } from "@/lib/hiker-demo-config";

type Phase = "audio" | "fade" | "zoom" | "search" | "revealed";

function DemoSequence({ restart }: { restart: () => void }) {
  const [phase, setPhase] = useState<Phase>("audio");
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (phase === "fade") {
      const timer = setTimeout(() => { setProgress(0); setPhase("zoom"); }, HIKER_DEMO.timing.fadeMs);
      return () => clearTimeout(timer);
    }
    if (phase !== "zoom" && phase !== "search") return;
    const duration = phase === "zoom" ? HIKER_DEMO.timing.zoomMs : HIKER_DEMO.timing.searchMs;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = reduced ? 1 : Math.min(1, (now - start) / duration);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else { setProgress(phase === "zoom" ? 0 : 1); setPhase(phase === "zoom" ? "search" : "revealed"); }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [phase]);
  const mapVisible = phase === "search" || phase === "revealed";
  return <div className={`cinematic-demo demo-phase-${phase}`} data-demo-phase={phase}>
    <div className="demo-topbar"><span className="demo-label">FICTIONAL SIMULATION</span><div><Button variant="ghost" onClick={() => { setProgress(1); setPhase("revealed"); }}><SkipForward size={16} /> Skip Animation</Button><Button variant="ghost" onClick={restart}><RotateCcw size={16} /> Restart Demo</Button></div></div>
    {(phase === "audio" || phase === "fade") && <div className="demo-audio-scene"><HikerDemo fullscreen onEnded={() => setPhase("fade")} /></div>}
    {(phase === "zoom" || mapVisible) && <>
      <div className={`demo-map-scene ${phase === "zoom" && progress < .76 ? "demo-map-hidden" : ""}`}><SimulatedSearch progress={mapVisible ? progress : 0} /></div>
      {phase === "zoom" && <div className={`demo-earth-scene ${progress >= .76 ? "demo-earth-blend" : ""}`}><RotatingGlobe active={false} zoomProgress={progress} target={HIKER_DEMO.location} /><div className="demo-destination"><span>SIMULATED DESTINATION</span><h2>Stawamus Chief</h2><p>Squamish, British Columbia</p></div></div>}
    </>}
  </div>;
}

export default function CinematicHikerDemo({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [run, setRun] = useState(0);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="cinematic-demo-dialog" aria-describedby="cinematic-demo-description"><DialogTitle className="sr-only">Fictional Stawamus Chief hiker demo</DialogTitle><DialogDescription id="cinematic-demo-description" className="sr-only">A configured simulation, not a real search or audio-derived location.</DialogDescription><DemoSequence key={run} restart={() => setRun(value => value + 1)} /></DialogContent></Dialog>;
}