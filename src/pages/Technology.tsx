import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Crosshair, Globe2, Radio, Ruler, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import DopplerExplorer from "@/components/DopplerExplorer";

const steps = [
  {
    icon: Waves, tag: "01 / THE DOPPLER EFFECT", title: "Why a passing plane changes pitch",
    body: [
      "Think of an ambulance siren: it sounds higher as it comes towards you and drops the moment it passes. Planes do the same thing. Their engines hum at a steady note, but while the plane flies towards you the sound waves get squashed together, so you hear a higher note. Once it flies away the waves stretch out, so the note drops.",
      "Some engine tones are quiet enough to go unnoticed, but a microphone may still capture them. Shown as a picture of sound over time, a passing plane leaves a curve that slides down from a high note to a low one.",
    ],
  },
  {
    icon: Ruler, tag: "02 / EXTRACTING THE SLANT RANGE", title: "How far away was the plane?",
    body: [
      "The shape of that curve says two things. How far apart the starting and ending notes are tells us how fast the plane was flying. How suddenly the note drops tells us how close it came: a plane right overhead makes the pitch fall almost all at once, while a distant one makes it slide down slowly.",
      "The \"slant range\" is the straight-line distance from the microphone to the plane at its closest point, measured through the air rather than along the ground. Matching the curve to the physics of sound gives the speed, the slant range and an estimate of when the plane was closest. Sound takes time to reach the microphone, so that delay must also be accounted for.",
    ],
  },
  {
    icon: Crosshair, tag: "03 / PINPOINTING THE LOCATION", title: "Turning one sound into one place",
    body: [
      "Aircraft broadcast their position every few seconds, and OpenSky Network records it. The experimental method compares candidate spots across Metro Vancouver and works out which planes would have passed that spot, how close they would have come, how fast they were flying and when the sound would have arrived.",
      "One flyover narrows things down to a few places near that plane's route. A second flyover, heard a set time later, has to fit too, and the gap between the two helps account for recording-clock errors. A missing flyover can be another clue, but noise, buildings and microphone settings can hide a plane. Matching several reliable signals can narrow the possible area; it does not guarantee a precise caller location.",
    ],
  },
];

const Technology = () => {
  useEffect(() => { document.title = "How it works · GeoLocator"; return () => { document.title = "GeoLocator — find where a sound begins"; }; }, []);
  return <div className="locator-site min-h-screen overflow-x-hidden">
    <SiteHeader />
    <main className="tech-page">
      <section className="tech-intro">
        <div className="section-caption">THE SCIENCE OF SOUND</div>
        <h1>The science behind<br /><span>audio geolocation.</span></h1>
        <p>A plain-language guide to the three ideas behind GeoLocator: the Doppler effect, measuring how far away a plane was, and comparing possible recording locations.</p>
      </section>

      <section className="technology tech-existing">
        <div className="technology-title"><h2>Hidden in the noise.<br /><span>A possible point of origin.</span></h2><p>Exploring the relationship between moving sound sources, flight paths, and the places we listen from.</p></div>
        <div className="signal-features"><article><Waves size={22} /><span>01 / FREQUENCY</span><h3>Doppler shift</h3><p>The change in pitch as an aircraft approaches and moves away offers clues about relative motion.</p></article><article><Radio size={22} /><span>02 / CORRELATION</span><h3>Aircraft signatures</h3><p>Engine harmonics and time-matched flight data could help narrow down potential sound sources.</p></article><article><Globe2 size={22} /><span>03 / LOCATION</span><h3>Signals to coordinates</h3><p>Multiple reference signals and known flight paths are needed to estimate an area with meaningful confidence.</p></article></div>
      </section>

      <section className="tech-steps">
        {steps.map(({ icon: Icon, tag, title, body }) => <article key={tag} className="tech-step">
          <div className="tech-step-head"><Icon size={20} /><span>{tag}</span></div>
          <h2>{title}</h2>
          {body.map((p, i) => <p key={i}>{p}</p>)}
        </article>)}
      </section>

      <section className="tech-explorer">
        <div className="section-caption">TRY IT YOURSELF</div>
        <h2>Move the plane. Watch the pitch.</h2>
        <p>The moving plane emits evenly spaced sound waves. Ahead of it, waves bunch together; behind it, they spread out. The curve follows the pitch arriving at the microphone, including the travel time of sound.</p>
        <DopplerExplorer />
      </section>

      <section className="tech-limits">
        <h2>What it needs to work</h2><p className="tech-status"><span className="status-dot" /> Research concept · Location results are currently simulated.</p>
        <ul>
          <li>At least one plane passing within a few kilometres, ideally two or more. Each extra flyover makes the answer much sharper.</li>
          <li>A rough idea of when the recording started. The closer you know the time, the better the result.</li>
          <li>Flight positions for that moment. Availability depends on the flight-data provider and access permissions; historical coverage is not guaranteed.</li>
          <li>The research model covers Metro Vancouver. Public map results remain simulated until live flight matching is verified.</li>
        </ul>
        <Button asChild className="primary-cta"><Link to="/#workspace">Locate a recording <ArrowRight size={17} /></Link></Button>
      </section>
    </main>
    <footer className="locator-footer"><Link to="/" className="brand"><Globe2 size={19} /> GeoLocator<span className="brand-audio">/ audio</span></Link><span>An exploration in acoustic geolocation.</span><span className="footer-status"><span className="status-dot" /> Experimental</span></footer>
  </div>;
};

export default Technology;
