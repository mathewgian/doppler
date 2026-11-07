import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Candidate } from "@/lib/acoustics/locate";

export default function ResultMap({ candidates, heat }: { candidates: Candidate[]; heat: [number, number, number][] }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current || !candidates.length) return;
    const top = candidates[0];
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([top.lat, top.lon], 14);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19 }).addTo(map);
    for (const [lat, lon, w] of heat) L.circle([lat, lon], { radius: 100, stroke: false, fillOpacity: 0.08 + 0.4 * w, className: "heat-cell" }).addTo(map);
    candidates.forEach((c, i) => {
      L.circle([c.lat, c.lon], { radius: c.radiusM, className: "sample-radius" }).addTo(map);
      const icon = L.divIcon({ className: `candidate-marker ${i === 0 ? "is-top" : ""}`, html: `<span>${i + 1}</span>`, iconSize: [26, 26], iconAnchor: [13, 13] });
      L.marker([c.lat, c.lon], { icon }).addTo(map).bindPopup(`Candidate ${i + 1} · ${(c.mass * 100).toFixed(0)}% of the likelihood`);
    });
    const b = L.latLngBounds(candidates.slice(0, 3).map(c => [c.lat, c.lon] as [number, number]));
    map.fitBounds(b.pad(0.6), { maxZoom: 15 });
    return () => { map.remove(); };
  }, [candidates, heat]);
  return <div ref={container} className="locator-map" aria-label="Map of estimated recording locations" />;
}
