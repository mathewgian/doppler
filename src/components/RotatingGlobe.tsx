import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import land from "@/assets/earth-land-dots.jpg.asset.json";
import fallback from "@/assets/signal-globe.jpg";

export default function RotatingGlobe({ active, zoomProgress = 0, target }: { active: boolean; zoomProgress?: number; target?: { lat: number; lng: number } }) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const flightRef = useRef({ zoomProgress, target });
  const [ready, setReady] = useState(false);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { flightRef.current = { zoomProgress, target }; }, [zoomProgress, target]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); }
    catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0, 0);
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 3.65;
    const tokens = getComputedStyle(element);
    const foreground = new THREE.Color(tokens.color);
    const surface = new THREE.Color(tokens.backgroundColor);
    const tilted = new THREE.Group();
    tilted.rotation.z = -23.44 * Math.PI / 180;
    const earth = new THREE.Group();
    earth.rotation.y = 0;
    tilted.add(earth); scene.add(tilted);
    const initialTilt = tilted.quaternion.clone();
    const sphereGeometry = new THREE.SphereGeometry(1, 96, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({ color: surface });
    earth.add(new THREE.Mesh(sphereGeometry, sphereMaterial));
    const dotMaterial = new THREE.MeshBasicMaterial({ color: foreground, transparent: true, opacity: 0.72, depthWrite: false });
    const dots = new THREE.Mesh(new THREE.SphereGeometry(1.003, 96, 64), dotMaterial);
    earth.add(dots);
    const gridMaterial = new THREE.LineBasicMaterial({ color: foreground, transparent: true, opacity: 0.12 });
    const gridGeometry = new THREE.BufferGeometry();
    const lines: number[] = [];
    const point = (lat: number, lon: number) => {
      const phi = lat * Math.PI / 180, theta = lon * Math.PI / 180;
      return [1.005 * Math.cos(phi) * Math.sin(theta), 1.005 * Math.sin(phi), 1.005 * Math.cos(phi) * Math.cos(theta)];
    };
    for (let lat = -75; lat <= 75; lat += 15) {
      for (let lon = -180; lon < 180; lon += 2) lines.push(...point(lat, lon), ...point(lat, lon + 2));
    }
    for (let lon = -180; lon < 180; lon += 15) {
      for (let lat = -90; lat < 90; lat += 2) lines.push(...point(lat, lon), ...point(lat + 2, lon));
    }
    gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(lines, 3));
    earth.add(new THREE.LineSegments(gridGeometry, gridMaterial));
    let disposed = false;
    let texture: THREE.Texture | undefined;
    new THREE.TextureLoader().load(land.url, loaded => {
      if (disposed) { loaded.dispose(); return; }
      texture = loaded;
      dotMaterial.alphaMap = loaded; dotMaterial.needsUpdate = true;
      setReady(true);
    }, undefined, () => { /* Keep the original globe if the asset is unavailable. */ });
    const resize = () => {
      const width = element.clientWidth, height = element.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const visibility = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; });
    visibility.observe(element);
    let previous = 0;
    renderer.setAnimationLoop(time => {
      const delta = previous ? Math.min((time - previous) / 1000, 0.1) : 0; previous = time;
      if (visible && activeRef.current && !reduced.matches && !document.hidden) earth.rotation.y += delta * Math.PI * 2 / 180;
      const flight = flightRef.current;
      if (flight.target) {
        const p = Math.max(0, Math.min(1, flight.zoomProgress));
        const eased = p * p * (3 - 2 * p);
        const lat = THREE.MathUtils.degToRad(flight.target.lat), lon = THREE.MathUtils.degToRad(flight.target.lng);
        // SphereGeometry's equirectangular UV convention: +X is longitude 180°, +Z is -90°.
        const destination = new THREE.Vector3(-Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon));
        tilted.quaternion.copy(initialTilt).slerp(new THREE.Quaternion().setFromUnitVectors(destination, new THREE.Vector3(0, 0, 1)), eased);
        camera.position.z = 1.025 + (3.65 - 1.025) * Math.pow(1 - eased, 2);
        camera.near = 0.001; camera.updateProjectionMatrix();
      }
      if (visible) renderer.render(scene, camera);
    });
    return () => {
      disposed = true; observer.disconnect(); visibility.disconnect(); renderer.setAnimationLoop(null);
      sphereGeometry.dispose(); sphereMaterial.dispose(); dots.geometry.dispose(); dotMaterial.dispose();
      gridGeometry.dispose(); gridMaterial.dispose(); texture?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <><img className={ready ? "globe-fallback globe-loaded" : "globe-fallback"} src={fallback} width={1024} height={1024} alt="" /><div ref={host} data-scene-ready={ready || undefined} className={ready ? "rotating-globe is-ready" : "rotating-globe"} /></>;
}