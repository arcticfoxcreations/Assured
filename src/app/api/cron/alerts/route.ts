import { runDueAlerts } from "@/lib/server/journeys";
import { safeEqual } from "@/lib/server/tokens";
import { fail, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Called every few minutes by the scheduler (see .github/workflows/alerts.yml
 * or any cron service). Sends "overdue" / "help" alerts even if the traveller's
 * phone is off. Protected by CRON_SECRET.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET ?? "";
  const given = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "") || req.headers.get("x-cron-secret") || "";
  if (secret.length < 16 || !safeEqual(secret, given)) return json({ error: "unauthorized" }, 401);
  try {
    return json({ ok: true, examined: await runDueAlerts() });
  } catch (e) {
    return fail(e);
  }
}
