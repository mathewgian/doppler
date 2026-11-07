import { useEffect, useRef } from "react";
import L from "leaflet";
import LocatorMap from "./LocatorMap";
import { demoRadius, demoSample, HIKER_DEMO } from "@/lib/hiker-demo-config";

export default function SimulatedSearch({ progress }: { progress: number }) {
  const layers = useRef<{ map: L.Map; plane: L.Marker; region: L.Circle; hiker: L.Marker; trail: L.Polyline }>();
  const sample = demoSample(progress);
  useEffect(() => {
    const current = layers.current;
    if (!current) return;
    current.plane.setLatLng([sample.lat, sample.lng]);
    current.region.setRadius(demoRadius(progress));
    current.hiker.setOpacity(progress >= 1 ? 1 : 0);
    const passed = HIKER_DEMO.flight.filter(p => Date.parse(p.timestamp) <= sample.timestamp).map(p => [p.lat, p.lng] as L.LatLngTuple);
    current.trail.setLatLngs([...passed, [sample.lat, sample.lng]]);
  }, [progress, sample.lat, sample.lng]);
  const hz = HIKER_DEMO.dopplerHz;
  const index = Math.min(hz.length - 2, Math.floor(progress * (hz.length - 1)));
  const f = progress * (hz.length - 1) - index;
  const pitch = hz[index] + (hz[index + 1] - hz[index]) * f;
  return <div className="sim-search">
    <LocatorMap location={HIKER_DEMO.location} showMarker={false} zoom={13} className="demo-search-map" onReady={map => {
      map.zoomControl.remove();
      const color = getComputedStyle(map.getContainer()).getPropertyValue("--signal").trim();
      const signal = `hsl(${color})`;
      const route = HIKER_DEMO.flight.map(p => [p.lat, p.lng] as L.LatLngTuple);
      L.polyline(route, { color: signal, opacity: .5, weight: 3, dashArray: "8 8", className: "fictional-flight-line" }).addTo(map);
      const trail = L.polyline([], { color: signal, weight: 5, className: "demo-flight-trail" }).addTo(map);
      const plane = L.marker([sample.lat, sample.lng], { zIndexOffset: 1000, icon: L.divIcon({ className: "demo-plane", html: '<span aria-label="Simulated aircraft">✈</span>', iconSize: [48, 48], iconAnchor: [24, 24] }) }).addTo(map);
      const region = L.circle([HIKER_DEMO.location.lat, HIKER_DEMO.location.lng], { radius: demoRadius(progress), color: signal, weight: 3, fillOpacity: .18, className: "demo-search-region" }).addTo(map);
      const hiker = L.marker([HIKER_DEMO.location.lat, HIKER_DEMO.location.lng], { opacity: progress >= 1 ? 1 : 0, icon: L.divIcon({ className: "location-marker", html: "<span></span>", iconSize: [24, 24], iconAnchor: [12, 12] }) }).addTo(map);
      const fit = () => map.fitBounds(L.latLngBounds(route).extend(region.getBounds()), { paddingTopLeft: [40, 100], paddingBottomRight: [40, 40], animate: false });
      fit();
      map.on("resize", fit);
      layers.current = { map, plane, region, hiker, trail };
    }} />
    <div className="demo-search-readout" role="status">
      <span className="demo-label">CONFIGURED SIMULATION · NOT AUDIO DETECTION</span>
      <h2>{progress >= 1 ? "Fictional hiker location" : "Simulated Doppler search"}</h2>
      <p>Stawamus Chief · Squamish, BC</p>
      {progress >= 1 && <><p className="demo-exact-coordinates">{HIKER_DEMO.location.lat}, {HIKER_DEMO.location.lng}</p><p>Story coordinates supplied for this demo, not inferred from the voice message.</p></>}
      <>
        <svg viewBox="0 0 300 72" role="img" aria-label="Scripted Doppler frequency curve"><path className="diagram-guide" d="M0 65H300" /><polyline className="diagram-line" points={hz.map((h, i) => `${i * 75},${65 - (h - 130)}`).join(" ")} /><circle className="demo-curve-point" cx={progress * 300} cy={65 - (pitch - 130)} r={4} /></svg>
        <dl><div><dt>Scripted frequency</dt><dd>{pitch.toFixed(1)} Hz</dd></div><div><dt>Search radius</dt><dd>{Math.round(demoRadius(progress))} m</dd></div><div><dt>Fictional altitude</dt><dd>{Math.round(sample.altitudeM)} m</dd></div><div><dt>Fictional velocity</dt><dd>{Math.round(sample.velocityMps)} m/s</dd></div></dl>
        <p className="demo-flight-time">Flight sample · {new Date(sample.timestamp).toISOString().slice(11, 19)} UTC</p>
      </>
    </div>
  </div>;
}