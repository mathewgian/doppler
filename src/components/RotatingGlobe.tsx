import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import land from "@/assets/earth-land-dots.jpg.asset.json";
import fallback from "@/assets/signal-globe.jpg";

export default function RotatingGlobe({ active }: { active: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const [ready, setReady] = useState(false);
  useEffect(() => { activeRef.current = active; }, [active]);

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
      if (visible) renderer.render(scene, camera);
    });
    return () => {
      disposed = true; observer.disconnect(); visibility.disconnect(); renderer.setAnimationLoop(null);
      sphereGeometry.dispose(); sphereMaterial.dispose(); dots.geometry.dispose(); dotMaterial.dispose();
      gridGeometry.dispose(); gridMaterial.dispose(); texture?.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <><img className={ready ? "globe-fallback globe-loaded" : "globe-fallback"} src={fallback} width={1024} height={1024} alt="" /><div ref={host} className={ready ? "rotating-globe is-ready" : "rotating-globe"} /></>;
}