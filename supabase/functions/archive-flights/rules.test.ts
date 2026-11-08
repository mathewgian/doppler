import { describe, expect, it } from "vitest";
import { requiredDays, validWindow } from "./rules";
describe("historical query bounds", () => {
  it("allows a ten-minute recording with five-minute clock error and padding", () => {
    expect(validWindow(1700000000, 1700001320, 1800000000)).toBe(true);
    expect(validWindow(1700000000, 1700001321, 1800000000)).toBe(false);
  });
  it("rejects invalid and future recording times", () => {
    expect(validWindow("1700000000", 1700000100)).toBe(false);
    expect(validWindow(1700000000, 1700000000)).toBe(false);
    expect(validWindow(1700000000, 1700000100, 1700000050)).toBe(false);
  });
  it("requires complete coverage on both sides of midnight", () => {
    const begin = Date.parse("2026-11-06T23:59:00Z") / 1000;
    expect(requiredDays(begin, begin + 120)).toEqual(["2026-11-06", "2026-11-07"]);
  });
});