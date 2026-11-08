import { describe, expect, it } from "vitest";
import { demoMapZoom, demoProgress, demoRadius, demoSample, HIKER_DEMO } from "./hiker-demo-config";

describe("configured fictional hiker demo", () => {
  it("shrinks the projected circle throughout the six-level map zoom and ends at 25 metres", () => {
    let previous = demoRadius(0);
    for (let i = 1; i <= 20; i++) {
      const p = i / 20;
      const projected = demoRadius(p) * 2 ** (6 * p);
      expect(projected).toBeLessThan(previous);
      previous = projected;
    }
    expect(demoRadius(0)).toBe(2400);
    expect(demoRadius(1)).toBe(25);
  });
  it("continues zooming across the Earth-to-search handoff to the final coordinates", () => {
    const handoff = HIKER_DEMO.timing.zoomMs;
    expect(demoMapZoom(handoff - 1)).toBeLessThan(demoMapZoom(handoff));
    expect(demoMapZoom(handoff)).toBeLessThan(demoMapZoom(handoff + 1));
    expect(demoMapZoom(handoff + 4500)).toBeGreaterThan(demoMapZoom(handoff));
    expect(demoMapZoom(handoff + HIKER_DEMO.timing.searchMs)).toBe(17);
  });
  it("never instantly skips the requested zoom or simulated search", () => {
    expect(demoProgress(16, 4500)).toBeLessThan(.01);
    expect(demoProgress(2250, 4500)).toBe(.5);
    expect(demoProgress(4500, 9000)).toBe(.5);
    expect(demoProgress(9000, 9000)).toBe(1);
  });
  it("ends at the supplied Stawamus Chief coordinates", () => {
    expect(HIKER_DEMO.location.lat).toBe(49.686508362919426);
    expect(HIKER_DEMO.location.lng).toBe(-123.13552565162448);
  });
  it("fades over one second", () => { expect(HIKER_DEMO.timing.fadeMs).toBe(1000); });
  it("zooms within the requested four to five seconds", () => {
    expect(HIKER_DEMO.timing.zoomMs).toBeGreaterThanOrEqual(4000);
    expect(HIKER_DEMO.timing.zoomMs).toBeLessThanOrEqual(5000);
  });
  it("moves through the configured flight and narrows the search", () => {
    expect(demoSample(0).lat).toBe(HIKER_DEMO.flight[0].lat);
    expect(demoSample(1).lng).toBeCloseTo(HIKER_DEMO.flight[3].lng, 10);
    expect(demoSample(.5).timestamp).toBe(Date.parse("2026-11-07T22:40:42Z"));
    expect(demoRadius(.5)).toBeLessThan(demoRadius(0));
    expect(demoRadius(1)).toBe(25);
  });
});