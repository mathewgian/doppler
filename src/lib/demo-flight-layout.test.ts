import { describe, expect, it } from "vitest";
import { layoutDemoFlight, sampleDemoFlight } from "./demo-flight-layout";

const route = [{ x: 0, y: 90 }, { x: 30, y: 60 }, { x: 60, y: 30 }, { x: 90, y: 0 }];
describe("fixed-scale simulated flight", () => {
  it("keeps the aircraft inside desktop and mobile map frames", () => {
    for (const [width, height] of [[592, 727], [390, 524]]) {
      const layout = layoutDemoFlight(route, width, height);
      for (let i = 0; i <= 100; i++) {
        const { point } = sampleDemoFlight(layout, i / 100);
        expect(point.x - 24).toBeGreaterThan(0);
        expect(point.x + 24).toBeLessThan(width);
        expect(point.y - 24).toBeGreaterThan(112);
        expect(point.y + 24).toBeLessThan(height);
      }
    }
  });
  it("moves equal distances in equal time without acceleration", () => {
    const layout = layoutDemoFlight(route, 592, 727);
    const distances = Array.from({ length: 20 }, (_, i) => {
      const a = sampleDemoFlight(layout, i / 20).point;
      const b = sampleDemoFlight(layout, (i + 1) / 20).point;
      return Math.hypot(b.x - a.x, b.y - a.y);
    });
    for (const distance of distances) expect(distance).toBeCloseTo(distances[0], 8);
  });
  it("keeps the aircraft connected to the trail through the final endpoint", () => {
    for (const p of [0, .25, .5, .9, 1]) {
      const sample = sampleDemoFlight(route, p);
      expect(sample.passed.at(-1)).toEqual(sample.point);
    }
    expect(sampleDemoFlight(route, 1).point).toEqual(route.at(-1));
  });
  it("keeps the route passing beside the green circle and its endpoint nearby", () => {
    const layout = layoutDemoFlight(route, 592, 727);
    const middle = sampleDemoFlight(layout, .5).point;
    expect(Math.hypot(middle.x - 296, middle.y - 363.5)).toBeLessThan(1);
    const end = sampleDemoFlight(layout, 1).point;
    expect(Math.hypot(end.x - 296, end.y - 363.5)).toBeLessThan(160);
  });
});