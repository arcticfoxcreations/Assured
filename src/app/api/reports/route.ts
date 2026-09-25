import { z } from "zod";
import { createReport, listReports } from "@/lib/server/reports";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { fail, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const Q = z.object({
  south: z.coerce.number().min(-90).max(90), north: z.coerce.number().min(-90).max(90),
  west: z.coerce.number().min(-180).max(180), east: z.coerce.number().min(-180).max(180),
});
const Body = z.object({
  category: z.string().max(40),
  description: z.string().max(2000),
  lat: z.number(), lng: z.number(), occurredAt: z.number(),
  website: z.string().max(200).optional(), // honeypot: real users never fill this in
});

export async function GET(req: Request) {
  const p = Q.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!p.success) return json({ error: "Invalid area." }, 400);
  if (p.data.north - p.data.south > 1 || p.data.east - p.data.west > 1) return json({ error: "Area too large." }, 400);
  try {
    return json({ reports: await listReports(p.data) });
  } catch (e) {
    return fail(e);
  }
}

export async function POST(req: Request) {
  if (!rateLimit(`rep:${clientIp(req)}`, 5, 3_600_000)) return json({ error: "You've submitted several reports recently. Please try again later." }, 429);
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ error: "Invalid report." }, 400);
  if (p.data.website) return json({ ok: true }); // bot: pretend success, store nothing
  try {
    const r = await createReport(p.data);
    return r.ok ? json({ ok: true }, 201) : json({ error: r.error }, r.status);
  } catch (e) {
    return fail(e);
  }
}
