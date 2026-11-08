type Concept = "doppler" | "range" | "location";

const titles = {
  doppler: "Sound waves bunch up ahead of a plane and spread out behind it",
  range: "Slant range is the diagonal distance from the microphone to the aircraft",
  location: "Two flight-path constraints overlap in a possible recording area",
};

export default function ConceptDiagram({ concept }: { concept: Concept }) {
  return <svg className="concept-diagram" viewBox="0 0 360 210" role="img" aria-label={titles[concept]}>
    <title>{titles[concept]}</title>
    <defs>
      <pattern id={`grid-${concept}`} width="24" height="24" patternUnits="userSpaceOnUse"><path d="M 24 0 L 0 0 0 24" className="diagram-grid" fill="none" /></pattern>
    </defs>
    <rect width="360" height="210" fill={`url(#grid-${concept})`} />
    {concept === "doppler" && <>
      {[{ x: 166, r: 88 }, { x: 177, r: 66 }, { x: 188, r: 44 }, { x: 199, r: 22 }].map(({ x, r }) => <circle key={x} cx={x} cy="90" r={r} className="diagram-wave" />)}
      <path d="M218 90l-24-14 7 14-7 14z" className="diagram-plane" />
      <path d="M292 90h45m-7-5 7 5-7 5" className="diagram-line" />
      <text x="20" y="190">Lower pitch</text><text x="262" y="190">Higher pitch</text>
      <text x="270" y="72" className="diagram-small">Flight direction</text>
    </>}
    {concept === "range" && <>
      <path d="M28 171H332M75 170V42M75 42H290" className="diagram-guide" />
      <path d="M75 170L290 42" className="diagram-line" />
      <path d="M75 157h13v13" className="diagram-guide" />
      <path d="M305 42l-24-14 7 14-7 14z" className="diagram-plane" />
      <circle cx="75" cy="170" r="5" className="diagram-mic" />
      <text x="22" y="110" className="diagram-small" transform="rotate(-90 22 110)">Altitude</text>
      <text x="160" y="192" className="diagram-small">Ground distance</text>
      <text x="137" y="96" transform="rotate(-31 137 96)" className="diagram-highlight">Slant range</text>
      <text x="34" y="198" className="diagram-small">Mic</text>
    </>}
    {concept === "location" && <>
      <path d="M35 48L318 164M75 187L285 27" className="diagram-guide" />
      <ellipse cx="179" cy="108" rx="134" ry="30" transform="rotate(22 179 108)" className="diagram-region" />
      <ellipse cx="179" cy="108" rx="115" ry="30" transform="rotate(-37 179 108)" className="diagram-region" />
      <circle cx="179" cy="108" r="15" className="diagram-wave" /><circle cx="179" cy="108" r="5" className="diagram-plane" />
      <path d="M179 124v48" className="diagram-line" />
      <text x="98" y="194" className="diagram-highlight">Possible recording area</text>
      <text x="23" y="31" className="diagram-small">Flight A</text><text x="270" y="24" className="diagram-small">Flight B</text>
    </>}
  </svg>;
}