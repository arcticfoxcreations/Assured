"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff } from "lucide-react";
import { api, type AlertKind, type AlertSummary } from "@/lib/travel/client";

const LABEL: Record<AlertKind, string> = { started: "Journey-started message", overdue: "Overdue alert", help: "Help alert", arrived: "Arrived-safely message" };
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const via = (v: string[]) => v.map((x) => (x === "sms" ? "SMS" : "email")).join(" + ");

/** Shows exactly what ASSURED has (and hasn't) sent. Polls the server; never claims a send it can't confirm. */
export function AlertStatus({ id, ownerKey, name, enabled, overdue }: { id: string; ownerKey: string; name: string; enabled: boolean; overdue: boolean }) {
  const [s, setS] = useState<AlertSummary | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const go = () => api.journeyAlerts(id, ownerKey).then((r) => { if (live && r.ok && r.data) setS(r.data); });
    go();
    const t = setInterval(go, 15_000);
    return () => { live = false; clearInterval(t); };
  }, [id, ownerKey, enabled]);

  if (!enabled) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        Automatic alerts are off for this journey. If you don&apos;t check in, ASSURED will not message {name || "your contact"} — only their guardian link will show “Check-in overdue”.
      </p>
    );
  }
  const kinds = (Object.keys(LABEL) as AlertKind[]).filter((k) => s?.events[k]);
  return (
    <div className="space-y-1.5 text-sm">
      <p className="flex items-start gap-2"><BellRing className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        Automatic alerts are ON — {name || "your contact"} will be messaged by {s ? via(s.via) : "…"} if you miss your check-in or press Get Help.</p>
      {kinds.map((k) => (
        <p key={k} className="pl-6 text-xs text-muted">✓ {LABEL[k]} sent by {via(s!.events[k]!.sent)} at {hhmm(s!.events[k]!.at)}</p>
      ))}
      {overdue && !s?.events.overdue && <p role="status" className="pl-6 text-xs text-amber-600 dark:text-amber-400">Overdue alert not confirmed as sent yet — it retries automatically. Please message them yourself too.</p>}
      {s && !s.linkInAlerts && <p className="pl-6 text-xs text-muted">Alerts won&apos;t include the live link (SHARE_TOKEN_SECRET isn&apos;t set on the server).</p>}
    </div>
  );
}
