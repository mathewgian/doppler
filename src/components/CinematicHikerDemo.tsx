import { useEffect, useState } from "react";
import { Pause, Play, RotateCcw, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import HikerDemo from "./HikerDemo";
import RotatingGlobe from "./RotatingGlobe";
import SimulatedSearch from "./SimulatedSearch";
import { demoMapZoom, demoProgress, HIKER_DEMO } from "@/lib/hiker-demo-config";

type Phase = "audio" | "fade" | "zoom" | "search" | "revealed";

function DemoSequence({ restart }: { restart: () => void }) {
  const [phase, setPhase] = useState<Phase>("audio");
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (phase === "fade") {
      const timer = setTimeout(() => { setProgress(0); setPhase("zoom"); }, HIKER_DEMO.timing.fadeMs);
      return () => clearTimeout(timer);
    }
    if (phase !== "zoom" && phase !== "search") return;
    if (paused) return;
    const duration = phase === "zoom" ? HIKER_DEMO.timing.zoomMs : HIKER_DEMO.timing.searchMs;
    const start = performance.now() - progress * duration;
    let frame = 0;
    const tick = (now: number) => {
      const p = demoProgress(now - start, duration);
      setProgress(p);
      if (p < 1) frame = requestAnimationFrame(tick);
      else { setProgress(phase === "zoom" ? 0 : 1); setPhase(phase === "zoom" ? "search" : "revealed"); }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // Progress is captured only when starting/resuming a phase.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paused]);
  const mapVisible = phase === "search" || phase === "revealed";
  const cameraElapsed = phase === "zoom" ? progress * HIKER_DEMO.timing.zoomMs
    : mapVisible ? HIKER_DEMO.timing.zoomMs + progress * HIKER_DEMO.timing.searchMs : 0;
  return <div className={`cinematic-demo demo-phase-${phase}`} data-demo-phase={phase}>
    <div className="demo-topbar"><span className="demo-label">FICTIONAL SIMULATION</span><div>{(phase === "zoom" || phase === "search") && <Button variant="ghost" onClick={() => setPaused(value => !value)}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Resume animation" : "Pause animation"}</Button>}<Button variant="ghost" onClick={() => { setProgress(1); setPhase("revealed"); }}><SkipForward size={16} /> Skip Animation</Button><Button variant="ghost" onClick={restart}><RotateCcw size={16} /> Restart Demo</Button></div></div>
    {(phase === "audio" || phase === "fade") && <div className="demo-audio-scene"><HikerDemo fullscreen onEnded={() => setPhase("fade")} /></div>}
    <>
      <div className={`demo-map-scene ${phase === "zoom" && progress < .76 ? "demo-map-hidden" : ""}`}><SimulatedSearch progress={mapVisible ? progress : 0} cameraZoom={demoMapZoom(cameraElapsed)} cameraPaused={paused} /></div>
      {!mapVisible && <div className={`demo-earth-scene ${phase !== "zoom" || progress >= .76 ? "demo-earth-blend" : ""}`}><RotatingGlobe active={false} zoomProgress={phase === "zoom" ? progress : 0} target={HIKER_DEMO.location} /><div className="demo-destination"><span>SIMULATED DESTINATION</span><h2>Stawamus Chief</h2><p>Squamish, British Columbia</p></div></div>}
    </>
  </div>;
}

export default function CinematicHikerDemo({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [run, setRun] = useState(0);
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="cinematic-demo-dialog"><DialogTitle className="sr-only">Fictional Stawamus Chief hiker demo</DialogTitle><DialogDescription className="sr-only">A configured simulation, not a real search or audio-derived location.</DialogDescription><DemoSequence key={run} restart={() => setRun(value => value + 1)} /></DialogContent></Dialog>;
}