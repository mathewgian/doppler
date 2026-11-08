import { describe, expect, it } from "vitest";
import { embeddedRecordingTime, parseZonedTimestamp } from "./recording-time";

/** Minimal ID3v2.4 tag shaped like the iPhone export of the Kitsilano reference recording. */
function id3(frames: [string, string][]) {
  const enc = new TextEncoder();
  const bodies = frames.map(([key, value]) => {
    const text = enc.encode(`${key}\u0000${value}`);
    const body = new Uint8Array(1 + text.length); body[0] = 3; body.set(text, 1);
    const f = new Uint8Array(10 + body.length);
    f.set(enc.encode("TXXX"));
    const n = body.length; f[4] = (n >> 21) & 127; f[5] = (n >> 14) & 127; f[6] = (n >> 7) & 127; f[7] = n & 127;
    f.set(body, 10); return f;
  });
  const size = bodies.reduce((s, b) => s + b.length, 0);
  const out = new Uint8Array(10 + size);
  out.set([0x49, 0x44, 0x33, 4, 0, 0, (size >> 21) & 127, (size >> 14) & 127, (size >> 7) & 127, size & 127]);
  let p = 10; for (const b of bodies) { out.set(b, p); p += b.length; }
  return out;
}

describe("embedded recording time", () => {
  it("converts a Pacific-time QuickTime stamp to the next UTC day", () => {
    // 18:43:05 PDT on July 19 is 01:43:05 UTC on July 20 — a different archive day.
    expect(parseZonedTimestamp("2025-07-19T18:43:05-0700")).toBe(Date.UTC(2025, 6, 20, 1, 43, 5) / 1000);
  });

  it("rejects timestamps without a zone", () => {
    expect(parseZonedTimestamp("2025-07-19T18:43:05")).toBeNull();
  });

  it("reads the creation date and ignores location tags", () => {
    const tag = id3([["major_brand", "qt  "], ["com.apple.quicktime.location.ISO6709", "+49.2868-123.1431+005.408/"], ["com.apple.quicktime.creationdate", "2025-07-19T18:43:05-0700"]]);
    expect(embeddedRecordingTime(tag)).toBe(Date.UTC(2025, 6, 20, 1, 43, 5) / 1000);
  });

  it("returns null when no time tag exists", () => {
    expect(embeddedRecordingTime(id3([["major_brand", "qt  "]]))).toBeNull();
  });
});
