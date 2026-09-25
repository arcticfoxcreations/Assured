"use client";

import { Info } from "lucide-react";
import { useServiceStatus } from "@/lib/travel/client";

/** Honest banner: says what this deployment can and can't do right now. Silent when everything needed is connected. */
export function ServiceNotice({ need }: { need: ("storage" | "routing")[] }) {
  const s = useServiceStatus();
  if (s === undefined) return null;
  const msgs: string[] = [];
  if (s === null) msgs.push("ASSURED's server couldn't be reached. Features that need it are paused; anything that runs on your device still works.");
  else {
    if (need.includes("storage") && s.storage === "none")
      msgs.push("The ASSURED backend isn't connected on this deployment yet, so guardian links and community reports are switched off. Everything that runs on your device still works.");
    if (need.includes("storage") && s.storage === "memory")
      msgs.push("Development mode: data is held in server memory and disappears when the server restarts.");
    if (need.includes("routing") && !s.routing)
      msgs.push("Route planning isn't set up on this deployment yet (no routing key configured), so routes can't be calculated.");
  }
  if (msgs.length === 0) return null;
  return (
    <div role="status" className="flex gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
      <div className="space-y-1">{msgs.map((m) => <p key={m}>{m}</p>)}</div>
    </div>
  );
}
