import { serverEnv } from "@/lib/env";
import { channels } from "@/lib/server/notify";
import { storageMode } from "@/lib/server/store";
import { json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

/** Tells the UI exactly which backend pieces exist, so it never over-claims. */
export async function GET() {
  return json({
    storage: storageMode(), // "supabase" | "memory" (dev only) | "none"
    routing: Boolean(serverEnv.orsKey()),
    // Delivery channels ASSURED can actually use to alert a guardian —
    // true only when the provider's keys are set. Push is not built.
    notifications: { ...channels(), push: false },
    scheduler: Boolean(process.env.CRON_SECRET),
    // Whether Mewvi may use Gemini to understand vague messages. Mewvi works either way.
    assistant: { gemini: Boolean(serverEnv.geminiKey()) },
  });
}
