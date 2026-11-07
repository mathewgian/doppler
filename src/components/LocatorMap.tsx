import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function LocatorMap() {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([49.2827, -123.1207], 11);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19 }).addTo(map);
    L.circle([49.2827, -123.1207], { radius: 2200, className: "sample-radius" }).addTo(map);
    const marker = L.divIcon({ className: "location-marker", html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] });
    L.marker([49.2827, -123.1207], { icon: marker }).addTo(map).bindPopup("Sample location · Vancouver, Canada");
    return () => { map.remove(); };
  }, []);
  return <div ref={container} className="locator-map" aria-label="Sample map centered on Vancouver, Canada" />;
}