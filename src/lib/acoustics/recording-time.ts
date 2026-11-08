/**
 * Reads only the embedded recording *time* from an audio file (ID3 tags or MP4/QuickTime atoms).
 * Location tags are deliberately ignored: the acoustic pipeline must derive position itself.
 */
const ISO_WITH_ZONE = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?\s*(Z|[+-]\d{2}:?\d{2})$/;

/** Parse ISO-8601 timestamps that carry an explicit zone (e.g. 2025-07-19T18:43:05-0700). */
export function parseZonedTimestamp(text: string): number | null {
  const m = ISO_WITH_ZONE.exec(text.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi, s = "0", zone] = m;
  let offsetMin = 0;
  if (zone !== "Z") {
    const z = zone.replace(":", "");
    offsetMin = (z[0] === "-" ? -1 : 1) * (Number(z.slice(1, 3)) * 60 + Number(z.slice(3, 5)));
  }
  const utc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +s) - offsetMin * 60_000;
  return Number.isFinite(utc) ? utc / 1000 : null;
}

const decoder = (enc: number) => new TextDecoder(enc === 1 ? "utf-16" : enc === 2 ? "utf-16be" : enc === 3 ? "utf-8" : "latin1");
function readText(bytes: Uint8Array) {
  if (!bytes.length) return [] as string[];
  return decoder(bytes[0]).decode(bytes.subarray(1)).split("\u0000").map(s => s.trim()).filter(Boolean);
}

function id3Time(buf: Uint8Array): number | null {
  if (buf.length < 10 || buf[0] !== 0x49 || buf[1] !== 0x44 || buf[2] !== 0x33) return null;
  const version = buf[3];
  if (version < 3) return null;
  const size = (buf[6] << 21) | (buf[7] << 14) | (buf[8] << 7) | buf[9];
  const end = Math.min(buf.length, 10 + size);
  let p = 10;
  let fallback: number | null = null;
  while (p + 10 <= end) {
    const id = String.fromCharCode(buf[p], buf[p + 1], buf[p + 2], buf[p + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const len = version === 4
      ? (buf[p + 4] << 21) | (buf[p + 5] << 14) | (buf[p + 6] << 7) | buf[p + 7]
      : ((buf[p + 4] << 24) >>> 0) + (buf[p + 5] << 16) + (buf[p + 6] << 8) + buf[p + 7];
    const body = buf.subarray(p + 10, p + 10 + len);
    if (id === "TXXX") {
      const [key, value] = readText(body);
      if (key && value && /creationdate|creation_time|date/i.test(key)) {
        const t = parseZonedTimestamp(value);
        if (t) return t;
      }
    } else if (id === "TDRC" || id === "TDRL") {
      const [value] = readText(body);
      if (value) fallback ??= parseZonedTimestamp(value);
    }
    p += 10 + len;
  }
  return fallback;
}

function mp4Time(buf: Uint8Array): number | null {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const text = new TextDecoder("latin1");
  // QuickTime "com.apple.quicktime.creationdate" values carry their zone; prefer them.
  const ascii = text.decode(buf.subarray(0, Math.min(buf.length, 4 * 1024 * 1024)));
  const tagged = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2}))/.exec(ascii.slice(Math.max(0, ascii.indexOf("creationdate"))));
  if (ascii.includes("creationdate") && tagged) { const t = parseZonedTimestamp(tagged[1]); if (t) return t; }
  const idx = ascii.indexOf("mvhd");
  if (idx >= 4 && idx + 16 < buf.length) {
    const versionByte = view.getUint8(idx + 4);
    const secs1904 = versionByte === 1 ? Number(view.getBigUint64(idx + 8)) : view.getUint32(idx + 8);
    const unix = secs1904 - 2082844800;
    if (unix > 946684800) return unix; // ignore unset (1904) or implausible clocks
  }
  return null;
}

/** Recording start time embedded by the recorder, in Unix seconds, or null when unavailable. */
export function embeddedRecordingTime(buf: Uint8Array): number | null {
  return id3Time(buf) ?? (buf.length > 8 && String.fromCharCode(buf[4], buf[5], buf[6], buf[7]) === "ftyp" ? mp4Time(buf) : null);
}
