import { z } from "zod";
import { createJourney } from "@/lib/server/journeys";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { fail, json } from "@/lib/server/http";
import { normPhone } from "@/lib/server/notify";
import { sanitizeUserText } from "@/lib/security/sanitize";

export const dynamic = "force-dynamic";

const pt = z.object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) });
const Body = z.object({
  destinationLabel: z.string().min(1).max(200),
  dest: pt.nullable(),
  route: z.array(pt).max(600).nullable(),
  mode: z.enum(["walking", "driving", "cycling"]),
  expectedArrival: z.number(),
  travellerName: z.string().max(60).optional(),
  alertTo: z
    .object({ name: z.string().min(1).max(60), email: z.string().email().max(120).optional(), phone: z.string().max(25).optional() })
    .nullable()
    .optional(),
});

export async function POST(req: Request) {
  if (!rateLimit(`j:${clientIp(req)}`, 10, 3_600_000)) return json({ error: "Too many journeys started. Try again later." }, 429);
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid journey." }, 400);
  try {
    const b = parsed.data;
    let alertTo = null;
    if (b.alertTo && (b.alertTo.email || b.alertTo.phone)) {
      const phone = b.alertTo.phone ? normPhone(b.alertTo.phone) : undefined;
      if (b.alertTo.phone && !phone) return json({ error: "That phone number doesn't look right. Use a 10-digit mobile or +country code." }, 400);
      alertTo = { name: sanitizeUserText(b.alertTo.name, 60), email: b.alertTo.email, phone: phone ?? undefined };
    }
    const linkBase = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? undefined;
    return json(
      await createJourney({ ...b, alertTo, linkBase, travellerName: sanitizeUserText(b.travellerName ?? "", 60), destinationLabel: sanitizeUserText(b.destinationLabel, 200) }),
      201
    );
  } catch (e) {
    return fail(e);
  }
}
