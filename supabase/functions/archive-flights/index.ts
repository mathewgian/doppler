import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { MAX_ROWS, requiredDays, validWindow } from "./rules.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { ...corsHeaders, "Content-Type": "application/json" },
});

// Deliberately public, read-only aircraft query. Audio never leaves the device.
// Privileged table access and completion checks stay here; no public table grants.
Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Use a recording time window." }, 405);
  try {
    const body = await req.json().catch(() => null);
    if (!validWindow(body?.begin, body?.end)) return json({ error: "Choose a valid past recording time and a window of 22 minutes or less." }, 400);
    const { begin, end } = body as { begin: number; end: number };
    const url = Deno.env.get("SUPABASE_URL"), key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ error: "Historical aircraft lookup is unavailable." }, 503);
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const days = requiredDays(begin, end);
    const { data: coverage, error: coverageError } = await db.from("aircraft_archive_days").select("day,archive_url").in("day", days);
    if (coverageError) throw new Error("coverage");
    const missing = days.filter(day => !coverage?.some(row => row.day === day));
    if (missing.length) return json({ code: "no_coverage", error: `No completed Metro Vancouver aircraft archive for ${missing.join(", ")}. No location can be calculated for that time.` }, 422);
    const rows: { icao24: string; callsign: string | null; observed_at: string; latitude: number; longitude: number; altitude_m: number | null }[] = [];
    for (let offset = 0; offset <= MAX_ROWS; offset += 1000) {
      const { data, error } = await db.from("aircraft_archive_positions")
        .select("icao24,callsign,observed_at,latitude,longitude,altitude_m")
        .eq("source", "adsb.lol").gte("observed_at", new Date(begin * 1000).toISOString()).lt("observed_at", new Date(end * 1000).toISOString())
        .gte("latitude", 49).lte("latitude", 49.4).gte("longitude", -123.3).lte("longitude", -122.55)
        .not("altitude_m", "is", null).gt("altitude_m", 0)
        .order("observed_at").order("icao24").range(offset, offset + 999);
      if (error) throw new Error("positions");
      rows.push(...(data ?? []));
      if (rows.length > MAX_ROWS) return json({ code: "too_dense", error: "Too many aircraft positions for this window. Trim the recording or use a more accurate recording time." }, 422);
      if (!data || data.length < 1000) break;
    }
    const tracks = new Map<string, { icao24: string; callsign: string; samples: { t: number; lat: number; lon: number; alt: number }[] }>();
    for (const row of rows) {
      if (row.altitude_m === null) continue;
      const track = tracks.get(row.icao24) ?? { icao24: row.icao24, callsign: row.callsign ?? "", samples: [] };
      track.samples.push({ t: Date.parse(row.observed_at) / 1000, lat: row.latitude, lon: row.longitude, alt: row.altitude_m });
      tracks.set(row.icao24, track);
    }
    return json({ tracks: [...tracks.values()].filter(track => track.samples.length >= 3), meta: {
      source: "ADSB.lol", attribution: "ADSB.lol and contributing feeders · ODbL 1.0", archiveUrls: coverage?.map(row => row.archive_url),
      days, rows: rows.length, complete: true,
    } });
  } catch {
    return json({ error: "Historical aircraft lookup is unavailable. Please try again later." }, 503);
  }
});