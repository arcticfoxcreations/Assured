import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { json } from "@/lib/server/http";
import { geminiNlu } from "@/lib/server/gemini";
import { respond } from "@/lib/mewvi/respond";

export const dynamic = "force-dynamic";

const Body = z.object({
  message: z.string().max(2000),
  pathname: z.string().max(200).optional(),
  activeJourney: z.boolean().optional(),
});

/**
 * Mewvi's endpoint. Runs the deterministic router; if GEMINI_API_KEY is set
 * it is asked to label vague messages only. With no key (or a bad one) the
 * reply comes from local rules and says so in `ai`.
 */
export async function POST(req: Request) {
  if (!rateLimit(`mewvi:${clientIp(req)}`, 40, 60_000)) return json({ error: "rate_limited" }, 429);
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const p = Body.safeParse(body);
  if (!p.success) return json({ error: "bad_request" }, 400);

  const reply = await respond(p.data, { nlu: geminiNlu() });
  return json(reply);
}
