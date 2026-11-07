import { describe, expect, it } from "vitest";
import { inMetroVancouver, pastMonthDays, requestDelay, REQUEST_INTERVAL_MS } from "./adsb-archive-rules.mjs";

describe("ADSB.lol archive import policy", () => {
  it("spaces source requests at least five seconds apart", () => {
    expect(REQUEST_INTERVAL_MS).toBe(5000);
    expect(requestDelay(1000, 4999)).toBe(1001);
    expect(requestDelay(1000, 6000)).toBe(0);
  });
  it("keeps Metro Vancouver positions and excludes other areas", () => {
    expect(inMetroVancouver(49.2827, -123.1207)).toBe(true);
    expect(inMetroVancouver(49.6865, -123.1355)).toBe(false);
    expect(inMetroVancouver(47.6062, -122.3321)).toBe(false);
    expect(inMetroVancouver(NaN, -123)).toBe(false);
  });
  it("selects the previous thirty complete UTC days", () => {
    const days = pastMonthDays(new Date("2026-11-07T23:28:00Z"));
    expect(days).toHaveLength(30);
    expect(days[0]).toBe("2026-10-08");
    expect(days[29]).toBe("2026-11-06");
  });
});