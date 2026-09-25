// src/lib/mewvi/client.ts — browser side. Asks ASSURED's server first (which may
// use Gemini); if the server can't be reached, the very same rules run here on
// the device, so Mewvi still answers offline — including the emergency flows.
import { respond } from "./respond";
import type { MewviReply, RespondInput } from "./types";

export async function askMewvi(input: RespondInput): Promise<MewviReply> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 7000);
  try {
    const res = await fetch("/api/mewvi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("bad_status");
    const data = (await res.json()) as MewviReply;
    if (!data || !Array.isArray(data.blocks)) throw new Error("bad_shape");
    return data;
  } catch {
    const local = await respond(input);
    return { ...local, offline: true };
  } finally {
    clearTimeout(timer);
  }
}
