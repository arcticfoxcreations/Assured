import { z } from "zod";
import { serverEnv } from "@/lib/env";
import { simplify } from "@/lib/travel/geo";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const pt = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const Body = z.object({ from: pt, to: pt, mode: z.enum(["walking", "driving", "cycling"]) });
const PROFILE = { walking: "foot-walking", driving: "driving-car", cycling: "cycling-regular" } as const;

interface OrsFeature { geometry: { coordinates: [number, number][] }; properties: { summary: { distance: number; duration: number } } }

export async function POST(req: Request) {
  const key = serverEnv.orsKey();
  if (!key) return json({ error: "routing_not_configured" }, 501);
  if (!rateLimit(`route:${clientIp(req)}`, 20, 60_000)) return json({ error: "rate_limited" }, 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Invalid request." }, 400);
  const { from, to, mode } = p.data;

  const call = (alternatives: boolean) =>
    fetch(`https://api.openrouteservice.org/v2/directions/${PROFILE[mode]}/geojson`, {
      method: "POST",
      cache: "no-store",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [[from.lng, from.lat], [to.lng, to.lat]],
        ...(alternatives ? { alternative_routes: { target_count: 3, share_factor: 0.6, weight_factor: 1.6 } } : {}),
      }),
    });

  try {
    let r = await call(true);
    if (!r.ok) r = await call(false); // alternatives unsupported for some trips
    if (!r.ok) return json({ error: "No route found between these points." }, 502);
    const d = (await r.json()) as { features?: OrsFeature[] };
    const routes = (d.features ?? []).slice(0, 3).map((f, i) => {
      let coords = simplify(f.geometry.coordinates.map(([lng, lat]) => ({ lat, lng })), 10);
      if (coords.length > 500) coords = simplify(coords, 40);
      return { id: `r${i + 1}`, coords, distanceM: f.properties.summary.distance, durationS: f.properties.summary.duration };
    });
    return routes.length ? json({ routes }) : json({ error: "No route found between these points." }, 502);
  } catch {
    return json({ error: "Routing is unavailable right now." }, 502);
  }
}
