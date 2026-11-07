// Returns aircraft position histories over a bounding box for a short time window, from OpenSky Network.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const API = "https://opensky-network.org/api/states/all";
const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
const MAX_REQUESTS = 60;

let cached: { token: string; exp: number } | null = null;
async function getToken(): Promise<string | null> {
  const id = Deno.env.get("OPENSKY_CLIENT_ID"), secret = Deno.env.get("OPENSKY_CLIENT_SECRET");
  if (!id || !secret) return null;
  if (cached && cached.exp > Date.now() + 30_000) return cached.token;
  const res = await fetch(TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: id, client_secret: secret }), signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new Error(`OpenSky sign-in failed [${res.status}]. Check the saved API client credentials.`);
  const j = await res.json();
  if (typeof j.access_token !== "string" || !j.access_token) throw new Error("OpenSky did not issue an access token.");
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 1800) * 1000 };
  return cached.token;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => null);
    const begin = Math.floor(Number(body?.begin)), end = Math.floor(Number(body?.end));
    const bbox = body?.bbox ?? {};
    const lamin = Number(bbox.lamin), lamax = Number(bbox.lamax), lomin = Number(bbox.lomin), lomax = Number(bbox.lomax);
    if (![begin, end, lamin, lamax, lomin, lomax].every(Number.isFinite) || end <= begin) return json({ error: "Invalid time window or area." }, 400);
    if ((lamax - lamin) * (lomax - lomin) > 4 || lamax <= lamin || lomax <= lomin) return json({ error: "Search area is too large." }, 400);
    const now = Math.floor(Date.now() / 1000);
    if (end > now + 60) return json({ error: "That recording time is in the future." }, 400);
    const step = Math.max(10, Math.ceil((end - begin) / MAX_REQUESTS / 10) * 10);
    if ((end - begin) / step > MAX_REQUESTS) return json({ error: "Time window is too long." }, 400);

    const token = await getToken();
    const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
    const times: number[] = [];
    for (let t = begin - (begin % 10); t <= end; t += step) times.push(t);

    const tracks = new Map<string, { icao24: string; callsign: string; samples: { t: number; lat: number; lon: number; alt: number }[] }>();
    let used = 0, mismatched = 0, remaining: string | null = null;
    const fetchOneRaw = async (t: number) => {
      const q = new URLSearchParams({ time: String(t), lamin: String(lamin), lamax: String(lamax), lomin: String(lomin), lomax: String(lomax) });
      const res = await fetch(`${API}?${q}`, { headers, signal: AbortSignal.timeout(20_000) });
      remaining = res.headers.get("x-rate-limit-remaining") ?? remaining;
      if (!res.ok) {
        throw Object.assign(new Error(`OpenSky flight-data request failed [${res.status}].`), { status: res.status });
      }
      const j = await res.json();
      // anonymous access ignores `time` and returns live data; never mix the wrong moment into the search
      if (typeof j.time !== "number" || Math.abs(j.time - t) > 15) { mismatched++; return; }
      used++;
      for (const s of j.states ?? []) {
        const [icao24, callsign, , timePos, , lon, lat, baro, onGround, , , , , geo] = s;
        if (onGround || lat == null || lon == null) continue;
        const alt = geo ?? baro;
        if (alt == null) continue;
        const rec = tracks.get(icao24) ?? { icao24, callsign: (callsign ?? "").trim(), samples: [] };
        rec.samples.push({ t: timePos ?? j.time, lat, lon, alt });
        tracks.set(icao24, rec);
      }
    };
    const fetchOne = (t: number) => fetchOneRaw(t).catch(e => { if (e?.name === "TimeoutError") throw Object.assign(new Error(token ? "OpenSky took too long to respond. Please try again in a minute." : "OpenSky did not respond. It usually turns away requests without an OpenSky account, so the account details need to be added."), { status: 504 }); throw e; });
    for (let i = 0; i < times.length; i += 6) await Promise.all(times.slice(i, i + 6).map(fetchOne));

    if (!used) {
      const reason = token
        ? "OpenSky has no position data for that time. Its live service only keeps about the last hour; older recordings need research access to its full history."
        : "Without an OpenSky account the service only returns live positions, so recordings from earlier times can't be checked yet.";
      return json({ error: reason, code: "no_history", authenticated: !!token }, 422);
    }
    const out = [...tracks.values()].map(r => ({ ...r, samples: r.samples.sort((a, b) => a.t - b.t).filter((p, i, a) => i === 0 || p.t > a[i - 1].t) })).filter(r => r.samples.length >= 3);
    return json({ tracks: out, meta: { requests: times.length, snapshots: used, skipped: mismatched, step, authenticated: !!token, creditsRemaining: remaining } });
  } catch (e) {
    const status = (e as { status?: number }).status;
    const message = e instanceof Error && e.message.startsWith("OpenSky") ? e.message : "Flight lookup failed. Please try again later.";
    console.error("opensky-flights failed:", { status: status ?? 502 });
    return json({ error: message }, status === 429 || status === 504 ? status : 502);
  }
});
