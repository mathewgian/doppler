export type FlightPoint = { x: number; y: number };

// The full geographic route cannot fit at street zoom. Show it explicitly as
// a fixed-scale schematic, not an edge-clamped geographic aircraft marker.
export function layoutDemoFlight(route: FlightPoint[], width: number, height: number) {
  const xs = route.map(p => p.x), ys = route.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const spanX = maxX - minX, spanY = maxY - minY;
  const availableWidth = Math.max(1, Math.min(260, width - 96));
  const availableHeight = Math.max(1, Math.min(220, height - 240));
  const scale = Math.min(availableWidth / Math.max(1, spanX), availableHeight / Math.max(1, spanY));
  const centerY = Math.max(154, Math.min(height - 54 - availableHeight / 2, height / 2));
  return route.map(p => ({ x: width / 2 + (p.x - (minX + maxX) / 2) * scale,
    y: centerY + (p.y - (minY + maxY) / 2) * scale }));
}

export function sampleDemoFlight(route: FlightPoint[], progress: number) {
  const lengths = route.slice(1).map((p, i) => Math.hypot(p.x - route[i].x, p.y - route[i].y));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = total * Math.max(0, Math.min(1, progress));
  for (let i = 0; i < lengths.length; i++) {
    if (remaining <= lengths[i] || i === lengths.length - 1) {
      const fraction = lengths[i] ? remaining / lengths[i] : 0;
      const point = { x: route[i].x + (route[i + 1].x - route[i].x) * fraction,
        y: route[i].y + (route[i + 1].y - route[i].y) * fraction };
      return { point, passed: [...route.slice(0, i + 1), point] };
    }
    remaining -= lengths[i];
  }
  return { point: route[0] ?? { x: 0, y: 0 }, passed: route };
}