import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const ICICS = { lat: 49.26126, lng: -123.24893, name: "UBC ICICS Building", address: "2366 Main Mall, Vancouver, BC" };

type Props = { cinematic?: boolean; className?: string; onArrive?: () => void };

export default function LocatorMap({ cinematic = false, className = "locator-map", onArrive }: Props) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const target: L.LatLngTuple = [ICICS.lat, ICICS.lng];
    const map = L.map(container.current, { scrollWheelZoom: false, zoomControl: !cinematic, zoomSnap: 0 })
      .setView(cinematic ? [30, -160] : target, cinematic ? 2.5 : 17);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>', maxZoom: 19 }).addTo(map);
    const marker = L.divIcon({ className: "location-marker", html: "<span></span>", iconSize: [24, 24], iconAnchor: [12, 12] });
    const addMarker = () => {
      L.circle(target, { radius: 45, className: "sample-radius" }).addTo(map);
      L.marker(target, { icon: marker }).addTo(map).bindPopup(`Sample location · ${ICICS.name}`);
    };
    let timers: ReturnType<typeof setTimeout>[] = [];
    if (cinematic) {
      map.once("moveend", () => { addMarker(); onArrive?.(); });
      timers.push(setTimeout(() => map.flyTo(target, 18, { duration: 6.5, easeLinearity: 0.05 }), 50));
    } else addMarker();
    return () => { timers.forEach(clearTimeout); timers = []; map.remove(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cinematic]);
  return <div ref={container} className={className} aria-label={`Map centered on ${ICICS.name}`} />;
}
