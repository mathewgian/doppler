import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import LocatorMap from "./LocatorMap";
import { demoRadius, demoSample, HIKER_DEMO } from "@/lib/hiker-demo-config";
import { layoutDemoFlight, sampleDemoFlight } from "@/lib/demo-flight-layout";

export default function SimulatedSearch({ progress, cameraZoom, cameraPaused }: { progress: number; cameraZoom: number; cameraPaused: boolean }) {
  const layers = useRef<{ map: L.Map; region: L.Circle; hiker: L.Marker; updateFlight: () => void }>();
  const flightProgress = useRef(progress);
  flightProgress.current = progress;
  const [searchRadius, setSearchRadius] = useState<number>(HIKER_DEMO.search.initialRadiusM);
  const sample = demoSample(progress);
  const cameraMoving = cameraZoom > HIKER_DEMO.mapCamera.initialZoom && cameraZoom < HIKER_DEMO.mapCamera.finalZoom;
  useEffect(() => {
    const current = layers.current;
    if (!current) return;
    const map = current.map;
    map.stop();
    if (cameraPaused) return;
    const target: L.LatLngTuple = [HIKER_DEMO.location.lat, HIKER_DEMO.location.lng];
    if (cameraMoving) {
      const cameraDuration = HIKER_DEMO.timing.searchMs + HIKER_DEMO.timing.zoomMs * (1 - HIKER_DEMO.mapCamera.blendStart);
      const remaining = (HIKER_DEMO.mapCamera.finalZoom - cameraZoom) / (HIKER_DEMO.mapCamera.finalZoom - HIKER_DEMO.mapCamera.initialZoom);
      map.flyTo(target, HIKER_DEMO.mapCamera.finalZoom, { duration: remaining * cameraDuration / 1000, easeLinearity: .5 });
    } else if (cameraZoom >= HIKER_DEMO.mapCamera.finalZoom) {
      map.setView(target, HIKER_DEMO.mapCamera.finalZoom, { animate: false });
    }
    return () => { map.stop(); };
    // Start/resume one native tile-preserving flight, not a tile reset on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraMoving, cameraPaused]);
  useEffect(() => {
    const current = layers.current;
    if (!current) return;
    current.hiker.setOpacity(progress >= 1 ? 1 : 0);
    current.updateFlight();
  }, [progress, sample.lat, sample.lng]);
  const hz = HIKER_DEMO.dopplerHz;
  const index = Math.min(hz.length - 2, Math.floor(progress * (hz.length - 1)));
  const f = progress * (hz.length - 1) - index;
  const pitch = hz[index] + (hz[index + 1] - hz[index]) * f;
  return <div className="sim-search" data-camera-zoom={cameraZoom.toFixed(4)}>
    <LocatorMap location={HIKER_DEMO.location} showMarker={false} zoom={HIKER_DEMO.mapCamera.initialZoom} className="demo-search-map" onReady={map => {
      map.zoomControl.remove();
      const route = HIKER_DEMO.flight.map(p => map.project([p.lat, p.lng], HIKER_DEMO.mapCamera.initialZoom));
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("class", "demo-flight-overlay");
      const makePath = (className: string) => {
        const path = document.createElementNS(svg.namespaceURI, "polyline");
        path.setAttribute("class", className);
        path.setAttribute("vector-effect", "non-scaling-stroke");
        svg.appendChild(path);
        return path;
      };
      const line = makePath("fictional-flight-line");
      const trail = makePath("demo-flight-trail");
      map.getContainer().appendChild(svg);
      const plane = L.DomUtil.create("div", "demo-plane demo-plane-overlay", map.getContainer());
      plane.textContent = "✈";
      const edgeLabel = L.DomUtil.create("span", "demo-aircraft-edge-label", map.getContainer());
      edgeLabel.textContent = "Full flight route · fixed-scale schematic";
      const updateFlight = () => {
        const size = map.getSize();
        const layout = layoutDemoFlight(route, size.x, size.y);
        const { point, passed } = sampleDemoFlight(layout, flightProgress.current);
        const points = (coords: { x: number; y: number }[]) => coords.map(p => `${p.x},${p.y}`).join(" ");
        line.setAttribute("points", points(layout));
        trail.setAttribute("points", points(passed));
        const { x, y } = point;
        plane.style.left = `${x}px`;
        plane.style.top = `${y}px`;
        plane.title = "Simulated aircraft on fixed-scale flight schematic";
        plane.setAttribute("aria-label", plane.title);
        edgeLabel.style.left = `${Math.max(8, size.x / 2 - 125)}px`;
        edgeLabel.style.top = `${Math.max(...layout.map(p => p.y)) + 32}px`;
      };
      map.on("move resize", updateFlight);
      const region = L.circle([HIKER_DEMO.location.lat, HIKER_DEMO.location.lng], { radius: HIKER_DEMO.search.initialRadiusM, opacity: 0, fillOpacity: 0 }).addTo(map);
      // A screen overlay avoids Leaflet's cached SVG scale during native flyTo.
      const circle = L.DomUtil.create("div", "demo-search-region", map.getContainer());
      circle.setAttribute("aria-label", "Simulated search area");
      const syncRadius = () => {
        const camera = HIKER_DEMO.mapCamera;
        const radius = demoRadius((map.getZoom() - camera.initialZoom) / (camera.finalZoom - camera.initialZoom));
        region.setRadius(radius);
        const metresPerPixel = 40075016.686 * Math.cos(HIKER_DEMO.location.lat * Math.PI / 180) / (256 * 2 ** map.getZoom());
        const diameter = 2 * radius / metresPerPixel;
        circle.style.width = `${diameter}px`;
        circle.style.height = `${diameter}px`;
        setSearchRadius(radius);
      };
      map.on("move", syncRadius);
      const hiker = L.marker([HIKER_DEMO.location.lat, HIKER_DEMO.location.lng], { opacity: progress >= 1 ? 1 : 0, icon: L.divIcon({ className: "location-marker", html: "<span></span>", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map);
      map.setView([HIKER_DEMO.location.lat, HIKER_DEMO.location.lng], cameraZoom, { animate: false });
      syncRadius();
      layers.current = { map, region, hiker, updateFlight };
      updateFlight();
    }} />
    <div className="demo-search-readout" role="status">
      <span className="demo-label">CONFIGURED SIMULATION · NOT AUDIO DETECTION</span>
      <h2>{progress >= 1 ? "Fictional hiker location" : "Simulated Doppler search"}</h2>
      <p>Stawamus Chief · Squamish, BC</p>
      {progress >= 1 && <><p className="demo-exact-coordinates">{HIKER_DEMO.location.lat}, {HIKER_DEMO.location.lng}</p><p>Story coordinates supplied for this demo, not inferred from the voice message.</p></>}
      <>
        <svg viewBox="0 0 300 72" role="img" aria-label="Scripted Doppler frequency curve"><path className="diagram-guide" d="M0 65H300" /><polyline className="diagram-line" points={hz.map((h, i) => `${i * 75},${65 - (h - 130)}`).join(" ")} /><circle className="demo-curve-point" cx={progress * 300} cy={65 - (pitch - 130)} r={4} /></svg>
        <dl><div><dt>Scripted frequency</dt><dd>{pitch.toFixed(1)} Hz</dd></div><div><dt>Search radius</dt><dd>{Math.round(searchRadius)} m</dd></div><div><dt>Fictional altitude</dt><dd>{Math.round(sample.altitudeM)} m</dd></div><div><dt>Fictional velocity</dt><dd>{Math.round(sample.velocityMps)} m/s</dd></div></dl>
        <p className="demo-flight-time">Flight sample · {new Date(sample.timestamp).toISOString().slice(11, 19)} UTC</p>
      </>
    </div>
  </div>;
}