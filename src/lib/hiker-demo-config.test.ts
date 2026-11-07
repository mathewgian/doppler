import { describe, expect, it } from "vitest";
import { demoProgress, demoRadius, demoSample, HIKER_DEMO } from "./hiker-demo-config";

describe("configured fictional hiker demo", () => {
  it("keeps the full zoom and search duration even with reduced motion", () => {
    expect(demoProgress(16, 4500, false)).toBe(0);
    expect(demoProgress(2250, 4500, false)).toBe(.5);
    expect(demoProgress(4500, 4500, false)).toBe(1);
    expect(demoProgress(4500, 9000, false)).toBe(.5);
    expect(demoProgress(9000, 9000, false)).toBe(1);
  });
  it("animates continuously when motion is explicitly enabled", () => {
    expect(demoProgress(450, 4500, true)).toBe(.1);
    expect(demoProgress(900, 9000, true)).toBe(.1);
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