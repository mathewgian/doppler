import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import TechnologySection from "@/components/TechnologySection";
import LocatorMap, { ICICS } from "@/components/LocatorMap";
import { ArrowDown, ArrowRight, Globe2, Radio, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioWorkspace from "@/components/AudioWorkspace";
import HikerDemo from "@/components/HikerDemo";
import RotatingGlobe from "@/components/RotatingGlobe";
import CinematicHikerDemo from "@/components/CinematicHikerDemo";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [demoRequest, setDemoRequest] = useState(0);
  const [hikerDemoOpen, setHikerDemoOpen] = useState(false);
  const [phase, setPhase] = useState<"idle" | "zooming" | "map" | "arrived">("idle");
  const startLocate = () => { window.scrollTo({ top: 0, behavior: "smooth" }); setPhase("zooming"); };
  const openWorkspace = () => { document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); };
  const openHikerDemo = () => { document.querySelectorAll("audio").forEach(audio => audio.pause()); setHikerDemoOpen(true); };
  const returnHome = () => { setPhase("idle"); navigate("/", { replace: true }); window.scrollTo({ top: 0 }); };
  useEffect(() => {
    if (location.search === "?demo=1") { setHikerDemoOpen(true); navigate("/", { replace: true }); }
    if (location.hash === "#workspace" || location.hash === "#technology") document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.search, location.hash, navigate]);
  const openDemo = () => { setDemoRequest(value => value + 1); openWorkspace(); };
  return (
    <div className="locator-site min-h-screen overflow-x-hidden">
      <SiteHeader onHome={returnHome} onDemo={openHikerDemo} onStart={openWorkspace} />
      <main>
        <section className={`globe-hero phase-${phase}`}>
          <div className="globe-background" aria-hidden="true"><RotatingGlobe active={phase === "idle"} /><div className="globe-crosshair crosshair-one">+</div><div className="globe-crosshair crosshair-two">+</div></div>
          <div className="hero-side-label left-label">SIGNAL → LOCATION</div><div className="hero-side-label right-label">49° 16′ N / 123° 07′ W</div>
          <div className="hero-content"><div className="hero-eyebrow"><span className="status-dot" /> SOUND. SIGNAL. SOMEWHERE.</div><h1 className="headline-reveal"><span className="headline-text">Find where<br />a sound <span className="headline-muted">begins.</span></span></h1><p>A world of signals. One point of origin.<br />Explore audio geolocation through Doppler shifts<br className="desktop-break" /> and the frequencies of aircraft overhead.</p><div className="hero-actions"><Button className="primary-cta" onClick={startLocate}>Locate a sound <ArrowRight size={17} /></Button><Button variant="ghost" className="demo-cta" onClick={startLocate}>Explore the demo <ArrowRight size={15} /></Button></div><div className="hero-note"><ShieldCheck size={12} /> No account needed <span>·</span> Audio stays on your device</div></div>
          {phase !== "idle" && <div className="hero-map"><LocatorMap cinematic className="hero-map-canvas" onArrive={() => setPhase("arrived")} /><div className="hero-map-vignette" aria-hidden="true" /></div>}
          {phase === "arrived" && <div className="hero-result"><span className="demo-label">SIMULATED RESULT</span><h3>{ICICS.name}</h3><p className="coordinates">49.2613° N, 123.2489° W</p><p>{ICICS.address}</p><div className="hero-result-actions"><Button size="sm" onClick={openDemo}>Open in workspace <ArrowRight /></Button><Button size="sm" variant="ghost" onClick={() => setPhase("idle")}>Reset</Button></div></div>}
          <div className="hero-bottom"><span><Radio size={13} /> THE WORLD IS ALWAYS TRANSMITTING</span><a href="#workspace" aria-label="Go to audio workspace"><ArrowDown size={18} /></a><span>LISTEN CLOSER.</span></div>
        </section>
        <HikerDemo onTryDemo={openHikerDemo} />
        <AudioWorkspace demoRequest={demoRequest} />
        <TechnologySection />
      </main>
      <footer className="locator-footer"><Link to="/" onClick={returnHome} className="brand"><Globe2 size={19} /> Doppler<span className="brand-audio">/ audio</span></Link><span>An exploration in acoustic geolocation.</span><span className="footer-status"><span className="status-dot" /> Experimental preview</span></footer>
      <CinematicHikerDemo open={hikerDemoOpen} onOpenChange={setHikerDemoOpen} />
    </div>
  );
};

export default Index;
