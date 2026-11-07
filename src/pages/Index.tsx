import { useState } from "react";
import { ArrowDown, ArrowRight, AudioLines, Globe2, Menu, Radio, ShieldCheck, Waves, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import AudioWorkspace from "@/components/AudioWorkspace";
import globe from "@/assets/signal-globe.jpg";

const Index = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoRequest, setDemoRequest] = useState(0);
  const openWorkspace = () => { document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" }); setMenuOpen(false); };
  const openDemo = () => { setDemoRequest(value => value + 1); openWorkspace(); };
  return (
    <div className="locator-site min-h-screen overflow-x-hidden">
      <header className="site-header">
        <a href="#" className="brand"><Globe2 size={22} /> GeoLocator<span className="brand-audio">/ audio</span></a>
        <nav className="desktop-nav"><a href="#technology">Technology</a><a href="#workspace">Workspace</a><Button variant="ghost" onClick={openDemo}>View demo <ArrowRight size={13} /></Button></nav>
        <Button onClick={openWorkspace} className="nav-cta">Get started <ArrowRight /></Button>
        <Button size="icon" variant="ghost" className="mobile-menu" aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</Button>
        {menuOpen && <nav className="mobile-nav"><a href="#technology" onClick={() => setMenuOpen(false)}>Technology</a><a href="#workspace" onClick={() => setMenuOpen(false)}>Workspace</a><Button variant="ghost" onClick={openDemo}>View demo <ArrowRight /></Button></nav>}
      </header>
      <main>
        <section className="globe-hero">
          <div className="globe-background" aria-hidden="true"><img src={globe} width={1024} height={1024} alt="" /><div className="globe-crosshair crosshair-one">+</div><div className="globe-crosshair crosshair-two">+</div></div>
          <div className="hero-side-label left-label">SIGNAL → LOCATION</div><div className="hero-side-label right-label">49° 16′ N / 123° 07′ W</div>
          <div className="hero-content"><div className="hero-eyebrow"><span className="status-dot" /> SOUND. SIGNAL. SOMEWHERE.</div><h1>Find where<br />a sound <span>begins.</span></h1><p>A world of signals. One point of origin.<br />Explore audio geolocation through Doppler shifts<br className="desktop-break" /> and the frequencies of aircraft overhead.</p><div className="hero-actions"><Button className="primary-cta" onClick={openWorkspace}>Locate a sound <ArrowRight size={17} /></Button><Button variant="ghost" className="demo-cta" onClick={openDemo}>Explore the demo <ArrowRight size={15} /></Button></div><div className="hero-note"><ShieldCheck size={12} /> No account needed <span>·</span> Audio stays on your device</div></div>
          <div className="hero-bottom"><span><Radio size={13} /> THE WORLD IS ALWAYS TRANSMITTING</span><a href="#workspace" aria-label="Go to audio workspace"><ArrowDown size={18} /></a><span>LISTEN CLOSER.</span></div>
        </section>
        <AudioWorkspace demoRequest={demoRequest} />
        <section id="technology" className="technology scroll-mt-8"><div className="section-caption">THE SCIENCE OF SOUND</div><div className="technology-title"><h2>Hidden in the noise.<br /><span>A possible point of origin.</span></h2><p>Exploring the relationship between moving sound sources, flight paths, and the places we listen from.</p></div><div className="signal-features"><article><Waves size={22} /><span>01 / FREQUENCY</span><h3>Doppler shift</h3><p>The change in pitch as an aircraft approaches and moves away offers clues about relative motion.</p></article><article><Radio size={22} /><span>02 / CORRELATION</span><h3>Aircraft signatures</h3><p>Engine harmonics and time-matched flight data could help narrow down potential sound sources.</p></article><article><Globe2 size={22} /><span>03 / LOCATION</span><h3>Signals to coordinates</h3><p>Multiple reference signals and known flight paths are needed to estimate an area with meaningful confidence.</p></article></div></section>
      </main>
      <footer className="locator-footer"><a href="#" className="brand"><Globe2 size={19} /> GeoLocator<span className="brand-audio">/ audio</span></a><span>An exploration in acoustic geolocation.</span><span className="footer-status"><span className="status-dot" /> Experimental preview</span></footer>
    </div>
  );
};

export default Index;
