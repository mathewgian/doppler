import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Crosshair, Globe2, Ruler, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import SiteHeader from "@/components/SiteHeader";
import DopplerExplorer from "@/components/DopplerExplorer";
import ConceptDiagram from "@/components/ConceptDiagram";

const steps = [
  {
    icon: Waves, concept: "doppler" as const, tag: "01 / THE DOPPLER EFFECT", title: "Why a passing plane changes pitch",
    body: [
      "Like an ambulance siren, a plane sounds higher as it approaches and lower as it moves away. Its motion bunches sound waves together in front and spreads them out behind. A microphone captures this pitch change as a falling frequency curve.",
    ],
  },
  {
    icon: Ruler, concept: "range" as const, tag: "02 / EXTRACTING THE SLANT RANGE", title: "How far away was the plane?",
    body: [
      "Slant range is the straight-line distance through the air from the microphone to the plane at its closest point. A sharper pitch drop suggests a closer pass; a gentler drop suggests a more distant one. Fitting the curve estimates this distance and the plane’s speed, while accounting for sound’s travel time.",
    ],
  },
  {
    icon: Crosshair, concept: "location" as const, tag: "03 / PINPOINTING THE LOCATION", title: "Where could the recording be from?",
    body: [
      "Known flight paths let us compare the timing and distance of each flyover with possible recording spots. Several matching passes can narrow the search to an overlapping area. Noise, missing flight data and clock errors limit accuracy, so audio alone cannot guarantee a precise location.",
    ],
  },
];

const Technology = () => {
  useEffect(() => { document.title = "How it works · GeoLocator"; return () => { document.title = "GeoLocator — find where a sound begins"; }; }, []);
  return <div className="locator-site min-h-screen overflow-x-hidden">
    <SiteHeader />
    <main className="tech-page">
      <section className="tech-explorer tech-explorer-first">
        <div className="section-caption">THE SCIENCE OF SOUND</div>
        <h1>Audio geolocation</h1>
        <DopplerExplorer />
      </section>

      <section className="tech-steps">
        {steps.map(({ icon: Icon, concept, tag, title, body }) => <article key={tag} className="tech-step">
          <div className="tech-step-copy">
          <div className="tech-step-head"><Icon size={20} /><span>{tag}</span></div>
          <h2>{title}</h2>
          {body.map((p, i) => <p key={i}>{p}</p>)}
          </div>
          <ConceptDiagram concept={concept} />
        </article>)}
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
