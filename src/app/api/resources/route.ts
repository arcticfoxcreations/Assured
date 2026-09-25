import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { UA, json } from "@/lib/server/http";
import type { Resource } from "@/lib/travel/types";

export const dynamic = "force-dynamic";

const Q = z.object({
  south: z.coerce.number().min(-90).max(90), north: z.coerce.number().min(-90).max(90),
  west: z.coerce.number().min(-180).max(180), east: z.coerce.number().min(-180).max(180),
});
const cache = new Map<string, { at: number; data: Resource[] }>();

/** Police stations, hospitals, fire stations, pharmacies, petrol pumps and ATMs from OpenStreetMap (via Overpass). */
export async function GET(req: Request) {
  if (!rateLimit(`res:${clientIp(req)}`, 20, 60_000)) return json({ error: "rate_limited" }, 429);
  const p = Q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) return json({ error: "Invalid area." }, 400);
  const { south, north, west, east } = p.data;
  if (north - south > 0.6 || east - west > 0.6 || north <= south || east <= west) return json({ error: "Area too large." }, 400);

  const key = [south, west, north, east].map((n) => n.toFixed(2)).join(",");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 3_600_000) return json({ resources: hit.data });

  const q = `[out:json][timeout:20];nwr["amenity"~"^(police|hospital|fire_station|pharmacy|fuel|atm)$"](${south},${west},${north},${east});out center 200;`;
  try {
    const r = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA },
      body: `data=${encodeURIComponent(q)}`,
    });
    if (!r.ok) throw new Error("upstream");
    const d = (await r.json()) as { elements: { type: string; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }[] };
    const data: Resource[] = d.elements.flatMap((e) => {
      const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
      const kind = e.tags?.amenity as Resource["kind"] | undefined;
      return lat !== undefined && lng !== undefined && kind ? [{ id: `${e.type}${e.id}`, kind, name: e.tags?.name ?? "Unnamed", lat, lng }] : [];
    });
    if (cache.size > 200) cache.clear();
    cache.set(key, { at: Date.now(), data });
    return json({ resources: data });
  } catch {
    return json({ resources: [], error: "Emergency resource data is unavailable right now." }, 502);
  }
}
