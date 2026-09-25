import { guardianView } from "@/lib/server/journeys";
import { clientIp, rateLimit } from "@/lib/server/rateLimit";
import { fail, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// The token travels in a header (and lives in the page's #fragment), so it
// never appears in server logs, analytics or Referer headers.
export async function GET(req: Request) {
  if (!rateLimit(`g:${clientIp(req)}`, 120, 60_000)) return json({ error: "rate_limited" }, 429);
  const token = req.headers.get("x-guardian-token") ?? "";
  if (token.length < 20 || token.length > 100) return json({ error: "expired_or_invalid" }, 404);
  try {
    const view = await guardianView(token);
    return view ? json(view) : json({ error: "expired_or_invalid" }, 404);
  } catch (e) {
    return fail(e);
  }
}
