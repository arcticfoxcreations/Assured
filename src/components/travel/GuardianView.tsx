"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Battery, BatteryCharging, CheckCircle2, LifeBuoy, Loader2, Phone, Radio, ShieldQuestion } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MiniMap, type MapLine, type MapMarker } from "@/components/travel/MiniMap";
import { api, type GuardianData } from "@/lib/travel/client";
import { fmtAgo, fmtClock, fmtDistance, mapsLink } from "@/lib/travel/geo";
import { cn } from "@/lib/utils";

const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
type Load = "loading" | "ok" | "gone" | "down" | "offline";

export function GuardianView() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [data, setData] = useState<GuardianData | null>(null);
  const [load, setLoad] = useState<Load>("loading");
  const [fetchedAt, setFetchedAt] = useState(0);
  const [, setTick] = useState(0);
  const hasData = useRef(false);

  // Token lives in the URL #fragment, which browsers never send to servers.
  useEffect(() => {
    const read = () => setToken(new URLSearchParams(window.location.hash.slice(1)).get("t"));
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  const refresh = useCallback(async (t: string) => {
    const r = await api.guardian(t);
    if (r.ok && r.data) { hasData.current = true; setData(r.data); setFetchedAt(Date.now()); setLoad("ok"); }
    else if (r.status === 404) { hasData.current = false; setData(null); setLoad("gone"); }
    else if (r.status === 503) setLoad("down");
    else setLoad("offline");
  }, []);

  useEffect(() => {
    if (!token) return;
    refresh(token);
    const poll = setInterval(() => { if (document.visibilityState === "visible") refresh(token); }, 10_000);
    const clock = setInterval(() => setTick((n) => n + 1), 1000);
    return () => { clearInterval(poll); clearInterval(clock); };
  }, [token, refresh]);

  if (token === undefined) return null;
  const wrap = "mx-auto w-full max-w-2xl space-y-4 px-4 py-6";

  if (!token) {
    return (
      <div className={wrap}>
        <Card className="flex flex-col items-center gap-3 py-10 text-center">
          <ShieldQuestion className="h-8 w-8 text-muted" aria-hidden="true" />
          <p className="font-medium">Open the link someone sent you</p>
          <p className="text-sm text-muted">This page shows a journey only when opened with a private guardian link from the traveller. There&apos;s nothing to see without one, and links can&apos;t be guessed.</p>
        </Card>
      </div>
    );
  }
  if (load === "loading" && !data) return <div className={wrap}><Card className="flex items-center gap-3" role="status"><Loader2 className="h-5 w-5 animate-spin text-primary" />Loading journey…</Card></div>;
  if (load === "gone") {
    return (
      <div className={wrap}>
        <Card className="space-y-2 py-8 text-center">
          <p className="font-medium">This link is no longer active</p>
          <p className="text-sm text-muted">It may have expired, or the traveller ended the journey or stopped sharing. If you&apos;re worried about them, contact them directly — and call 112 in an emergency.</p>
          <div className="pt-2"><Button href="tel:112" variant="emergency"><Phone className="h-4 w-4" aria-hidden="true" />Call 112</Button></div>
        </Card>
      </div>
    );
  }
  if (!data) {
    return <div className={wrap}><Card className="py-8 text-center"><p className="font-medium">Guardian view is unavailable</p><p className="mt-1 text-sm text-muted">{load === "down" ? "The ASSURED backend isn't connected on this deployment, so journeys can't be shown." : "Couldn't reach ASSURED. Check your connection — this page will keep retrying."}</p></Card></div>;
  }

  const serverNow = data.serverNow + (Date.now() - fetchedAt);
  const f = data.lastFix;
  const untilEta = data.expectedArrival - serverNow;
  const stale = f ? serverNow - f.at > 5 * 60_000 : false;
  const status = data.status === "active" && untilEta <= 0 ? "overdue" : data.status; // keep ticking between polls
  const S = {
    active: { icon: Radio, title: "Journey in progress", tone: "border-primary/40 bg-primary/10" },
    overdue: { icon: AlertTriangle, title: "Check-in overdue", tone: "border-emergency/50 bg-emergency/10" },
    help: { icon: LifeBuoy, title: "Asked for help", tone: "border-emergency/50 bg-emergency/10" },
    arrived: { icon: CheckCircle2, title: "Arrived safely", tone: "border-safe/40 bg-safe/10" },
  }[status];
  const Icon = S.icon;

  const lines: MapLine[] = data.route ? [{ coords: data.route, tone: "primary" }] : [];
  const markers: MapMarker[] = [];
  if (data.dest) markers.push({ pos: data.dest, kind: "dest", label: `Destination: ${data.destinationLabel}` });
  if (f) markers.push({ pos: f, kind: "you", label: "Last known location" });
  const cell = "rounded-xl border border-border bg-surface-2/50 p-3";

  return (
    <div className={wrap}>
      <div role="status" className={cn("flex items-center gap-3 rounded-2xl border-2 p-4", S.tone)}>
        <Icon className="h-6 w-6 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-lg font-semibold">{S.title}</p>
          <p className="text-sm text-muted">
            {status === "active" && `Expected to arrive by ${hhmm(data.expectedArrival)}`}
            {status === "overdue" && `They were expected by ${hhmm(data.expectedArrival)} and haven't checked in.`}
            {status === "help" && "They tapped “Get Help” in ASSURED."}
            {status === "arrived" && "They marked themselves safe. Their location is no longer stored."}
          </p>
        </div>
      </div>

      {(status === "overdue" || status === "help") && (
        <Card className="space-y-2 border-emergency/40">
          <p className="text-sm">Try calling them first. If you believe they are in danger, call the emergency number — ASSURED can&apos;t contact anyone on your behalf.</p>
          <Button href="tel:112" variant="emergency"><Phone className="h-4 w-4" aria-hidden="true" />Call 112</Button>
        </Card>
      )}
      {load === "offline" && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">You appear to be offline — showing the last update received {fmtAgo(Date.now() - fetchedAt)}.</p>}

      {status !== "arrived" && (
        <>
          <MiniMap ariaLabel="Map showing the traveller's last known location, planned route and destination" lines={lines} markers={markers} accuracyM={f?.accuracy} height={280} />
          {!f && <p className="text-sm text-muted">No location has been received yet. Live location only arrives while the traveller has ASSURED open with tracking turned on.</p>}
          {f && <p className="text-xs"><a className="underline" href={mapsLink(f)} target="_blank" rel="noopener noreferrer">Open last known location in Maps</a></p>}
        </>
      )}

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={cell}><p className="text-xs text-muted">Destination</p><p className="mt-1 font-medium">{data.destinationLabel}</p></div>
        <div className={cell}><p className="text-xs text-muted">ETA</p><p className="mt-1 font-medium">{hhmm(data.expectedArrival)}</p><p className="text-xs text-muted">{status === "arrived" ? "—" : untilEta > 0 ? `in ${fmtClock(untilEta)}` : `${fmtClock(-untilEta)} past`}</p></div>
        <div className={cell}>
          <p className="text-xs text-muted">Last update</p>
          <p className="mt-1 font-medium">{f ? `${hhmm(f.at)} · ${fmtAgo(serverNow - f.at)}` : "None yet"}</p>
          {stale && <p className="text-xs text-amber-600 dark:text-amber-400">Their phone may have paused tracking.</p>}
        </div>
        <div className={cell}>
          <p className="text-xs text-muted">Check-in status</p>
          <p className="mt-1 font-medium">{data.checkIn?.state === "safe" ? `Marked safe at ${hhmm(data.checkIn.at)}` : data.checkIn?.state === "help" ? `Asked for help at ${hhmm(data.checkIn.at)}` : status === "overdue" ? "Overdue" : "Not yet checked in"}</p>
        </div>
        {status !== "arrived" && (
          <div className={cell}>
            <p className="text-xs text-muted">Route</p>
            <p className="mt-1 font-medium">{!data.route ? "No planned route" : data.deviation?.off ? `Off route · ~${fmtDistance(data.deviation.distanceM)}` : data.deviation ? "On planned route" : "Not checked yet"}</p>
          </div>
        )}
        {status !== "arrived" && (
          <div className={cell}>
            <p className="text-xs text-muted">Battery</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium">
              {f?.battery ? <>{f.battery.charging ? <BatteryCharging className="h-4 w-4" aria-hidden="true" /> : <Battery className="h-4 w-4" aria-hidden="true" />}{Math.round(f.battery.level * 100)}%</> : "Not reported by their device"}
            </p>
          </div>
        )}
      </div>

      <Card className="bg-surface-2/50 text-xs text-muted">
        Read-only, private link. It expires automatically (by {new Date(data.expiresAt).toLocaleString()}) and stops working immediately if the traveller ends the journey. Anyone with this link can see this page — don&apos;t share it further.
      </Card>
    </div>
  );
}
