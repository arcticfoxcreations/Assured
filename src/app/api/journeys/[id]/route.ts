import { z } from "zod";
import { endJourney, ownerStatus, patchJourney } from "@/lib/server/journeys";
import { fail, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const pt = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const Body = z.object({
  fix: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
      accuracy: z.number().nullable(),
      at: z.number(),
      battery: z.object({ level: z.number().min(0).max(1), charging: z.boolean() }).optional(),
    })
    .nullable()
    .optional(),
  deviation: z.object({ off: z.boolean(), distanceM: z.number() }).nullable().optional(),
  route: z.array(pt).max(600).nullable().optional(),
  status: z.enum(["arrived", "help", "active"]).optional(),
  extendMs: z.number().min(0).max(3_600_000).optional(),
});

type Ctx = { params: { id: string } };

export async function PATCH(req: Request, { params }: Ctx) {
  const key = req.headers.get("x-owner-key") ?? "";
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!key || !parsed.success) return json({ error: "Invalid request." }, 400);
  try {
    const ok = await patchJourney(params.id, key, parsed.data);
    return ok ? json({ ok: true }) : json({ error: "not_found" }, 404); // also covers wrong key / expired
  } catch (e) {
    return fail(e);
  }
}

/** Owner-only: what alerts ASSURED has actually sent for this journey. */
export async function GET(req: Request, { params }: Ctx) {
  const key = req.headers.get("x-owner-key") ?? "";
  try {
    const st = key ? await ownerStatus(params.id, key) : null;
    return st ? json(st) : json({ error: "not_found" }, 404);
  } catch (e) {
    return fail(e);
  }
}

export async function DELETE(req: Request, { params }: Ctx) {
  const key = req.headers.get("x-owner-key") ?? "";
  try {
    const ok = key ? await endJourney(params.id, key) : false;
    return ok ? json({ ok: true }) : json({ error: "not_found" }, 404);
  } catch (e) {
    return fail(e);
  }
}
