import { flagReport } from "@/lib/server/reports";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { fail, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** "Report abuse": 3 distinct flags hide a report until it is reviewed. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const ip = clientIp(req);
  if (!rateLimit(`flag:${ip}`, 20, 3_600_000)) return json({ error: "Too many flags. Try again later." }, 429);
  try {
    const r = await flagReport(params.id, ip);
    return r.ok ? json({ ok: true, hidden: r.value.hidden }) : json({ error: r.error }, r.status);
  } catch (e) {
    return fail(e);
  }
}
