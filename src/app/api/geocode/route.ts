import { serverEnv } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { UA, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

interface Hit { label: string; lat: number; lng: number }

// India-focused product: results are limited to India. Change COUNTRY to widen.
const COUNTRY = "in";

export async function GET(req: Request) {
  if (!rateLimit(`geo:${clientIp(req)}`, 30, 60_000)) return json({ error: "rate_limited" }, 429);
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 3) return json({ results: [] });
  try {
    const key = serverEnv.orsKey();
    let results: Hit[];
    if (key) {
      const u = new URL("https://api.openrouteservice.org/geocode/search");
      u.searchParams.set("api_key", key);
      u.searchParams.set("text", q);
      u.searchParams.set("boundary.country", COUNTRY.toUpperCase());
      u.searchParams.set("size", "5");
      const r = await fetch(u, { cache: "no-store" });
      if (!r.ok) throw new Error("upstream");
      const d = (await r.json()) as { features?: { properties: { label: string }; geometry: { coordinates: [number, number] } }[] };
      results = (d.features ?? []).map((f) => ({ label: f.properties.label, lng: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }));
    } else {
      // Keyless fallback: OpenStreetMap Nominatim (low volume; rate-limited above).
      const u = new URL("https://nominatim.openstreetmap.org/search");
      u.searchParams.set("format", "jsonv2");
      u.searchParams.set("q", q);
      u.searchParams.set("limit", "5");
      u.searchParams.set("countrycodes", COUNTRY);
      const r = await fetch(u, { headers: { "User-Agent": UA }, cache: "no-store" });
      if (!r.ok) throw new Error("upstream");
      const d = (await r.json()) as { display_name: string; lat: string; lon: string }[];
      results = d.map((x) => ({ label: x.display_name, lat: Number(x.lat), lng: Number(x.lon) }));
    }
    return json({ results });
  } catch {
    return json({ results: [], error: "Place search is unavailable right now. You can paste coordinates like 26.9124, 75.7873." }, 502);
  }
}
