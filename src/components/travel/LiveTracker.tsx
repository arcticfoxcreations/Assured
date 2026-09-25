"use client";

import { useEffect, useRef, useState } from "react";
import { Battery, BatteryCharging, Loader2, LocateFixed, Radio, RefreshCw, ShieldOff, Share2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/states/EmptyState";
import { GeoProblem } from "@/components/travel/GeoProblem";
import { MiniMap, type MapLine, type MapMarker } from "@/components/travel/MiniMap";
import { ShareSheet } from "@/components/travel/ShareSheet";
import { api, guardianUrl, useBattery, useGeolocation, useNow, useSaved } from "@/lib/travel/client";
import { checkDeviation, fmtClock, fmtDistance, haversineM, mapsLink, remainingAlongM, type Deviation } from "@/lib/travel/geo";
import { MODE_SPEED_MPS } from "@/lib/travel/types";

const THRESHOLDS = [100, 200, 300, 500];
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const hhmmss = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export function LiveTracker() {
  const s = useSaved();
  const geo = useGeolocation();
  const battery = useBattery();
  const now = useNow(1000);

  const [dev, setDev] = useState<Deviation | null>(null);
  const [alertOn, setAlertOn] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [msg, setMsg] = useState("");
  const [syncErr, setSyncErr] = useState("");
  const [recalc, setRecalc] = useState(false);

  // Latest values for the position effect, which must only fire on a new fix.
  const jRef = useRef(s.journey); jRef.current = s.journey;
  const thrRef = useRef(s.deviationM); thrRef.current = s.deviationM;
  const batRef = useRef(battery); batRef.current = battery;
  const patchRef = useRef(s.patchJourney); patchRef.current = s.patchJourney;
  const offCount = useRef(0);
  const snoozeUntil = useRef(0);
  const lastSent = useRef(0);

  useEffect(() => {
    const j = jRef.current, f = geo.fix;
    if (!j || !f) return;
    let d: Deviation | null = null;
    if (j.route && j.route.length > 1 && j.routeMeta?.source === "routing") {
      d = checkDeviation(f, j.route, thrRef.current);
      if (!d.uncertain) {
        offCount.current = d.off ? offCount.current + 1 : 0; // two consecutive off-route fixes = a real change
        if (!d.off) setAlertOn(false);
      }
      if (offCount.current >= 2 && Date.now() > snoozeUntil.current) setAlertOn(true);
    }
    setDev(d);

    if (j.id && j.ownerKey && Date.now() - lastSent.current >= 15_000) {
      lastSent.current = Date.now();
      const b = batRef.current;
      api.patchJourney(j.id, j.ownerKey, {
        fix: { lat: f.lat, lng: f.lng, accuracy: f.accuracy, at: f.at, ...(b ? { battery: { level: b.level, charging: b.charging } } : {}) },
        ...(d && !d.uncertain ? { deviation: { off: offCount.current >= 2, distanceM: Math.round(d.distanceM) } } : {}),
      }).then((r) => {
        if (r.ok) { patchRef.current({ sharing: true, lastSentAt: Date.now() }); setSyncErr(""); }
        else setSyncErr(r.error === "offline" ? "You're offline — your guardian's view isn't updating. Retrying." : "Couldn't update your guardian right now. Retrying.");
      });
    }
  }, [geo.fix]);

  // Never leave a stale "sharing" flag behind if the tab is closed or navigated away.
  useEffect(() => {
    const off = () => patchRef.current({ sharing: false });
    window.addEventListener("pagehide", off);
    return () => { window.removeEventListener("pagehide", off); off(); };
  }, []);

  if (!s.ready) return null;
  const j = s.journey;
  if (!j || j.status === "arrived") {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <EmptyState icon={Radio} title="No journey to track"
          description="Start a journey with a destination and expected arrival time, then come back here to turn on live tracking."
          action={<Button href="/travel/check-in">Start a journey</Button>} />
      </div>
    );
  }

  const remote = Boolean(j.id && j.ownerKey);
  const f = geo.fix;
  const tracking = geo.state === "active" || geo.state === "requesting" || f !== null;
  const sharingLive = remote && j.sharing && j.lastSentAt !== undefined && now - j.lastSentAt < 120_000;
  const monitored = Boolean(j.route && j.route.length > 1 && j.routeMeta?.source === "routing");

  let eta = "—";
  let distLeft: number | null = null;
  if (f && j.dest) {
    if (monitored && j.route) {
      distLeft = remainingAlongM(f, j.route);
      const spd = j.routeMeta && j.routeMeta.durationS > 0 ? j.routeMeta.distanceM / j.routeMeta.durationS : MODE_SPEED_MPS[j.mode];
      eta = hhmm(now + (distLeft / spd) * 1000);
    } else {
      distLeft = haversineM(f, j.dest);
      eta = `${hhmm(now + (distLeft / MODE_SPEED_MPS[j.mode]) * 1000)} (straight-line estimate)`;
    }
  }

  const lines: MapLine[] = j.route ? [{ coords: j.route, tone: "primary" }] : [];
  const markers: MapMarker[] = [];
  if (j.dest) markers.push({ pos: j.dest, kind: "dest", label: `Destination: ${j.destinationLabel}` });
  if (f) markers.push({ pos: f, kind: "you", label: "Your position" });

  function start() { setMsg(""); offCount.current = 0; geo.watch(); }
  async function stop() {
    geo.stop(); setDev(null); setAlertOn(false); offCount.current = 0;
    patchRef.current({ sharing: false });
    if (remote) await api.patchJourney(j!.id!, j!.ownerKey!, { fix: null, deviation: null }); // also clears the last known location
    setMsg("Live sharing stopped. Your last known location was removed from your guardian's view.");
  }
  async function recalculate() {
    if (!f || !j!.dest) return setMsg("Recalculating needs your current position and a destination pinned on the map.");
    setRecalc(true);
    const r = await api.route(f, j!.dest, j!.mode);
    setRecalc(false);
    if (r.status === 501) return setMsg("Route recalculation isn't set up on this deployment yet.");
    const best = r.data?.routes[0];
    if (!best) return setMsg("Couldn't calculate a new route right now. Try again shortly.");
    s.patchJourney({ route: best.coords, routeMeta: { distanceM: best.distanceM, durationS: best.durationS, source: "routing" } });
    if (remote) await api.patchJourney(j!.id!, j!.ownerKey!, { route: best.coords, deviation: { off: false, distanceM: 0 } });
    offCount.current = 0; setAlertOn(false); setMsg("Route updated from where you are now.");
  }
  function keepGoing() { snoozeUntil.current = Date.now() + 10 * 60_000; setAlertOn(false); }
  async function endIt() {
    if (!window.confirm("End this journey? Tracking stops, your guardian link stops working and journey data is removed.")) return;
    geo.stop();
    if (remote) await api.endJourney(j!.id!, j!.ownerKey!);
    s.update({ journey: null });
  }

  const cell = "rounded-xl border border-border bg-surface-2/50 p-3";
  const gLink = j.guardianToken ? guardianUrl(j.guardianToken) : "";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${sharingLive ? "border-safe/40 bg-safe/10" : "border-border bg-surface-2/50"}`}>
        <Radio className={`mt-0.5 h-4 w-4 shrink-0 ${sharingLive ? "text-safe" : "text-muted"}`} aria-hidden="true" />
        <div>
          <p className="font-medium">
            {sharingLive ? `Sharing live location with your guardian · updated ${hhmmss(j.lastSentAt!)}` : tracking && f ? "Tracking on this device only — nobody else can see your location" : "Not sharing your location"}
          </p>
          <p className="mt-0.5 text-xs text-muted">Tracking only works while this page is open and permitted. If your screen locks or you leave this page, it pauses.</p>
        </div>
      </div>

      {msg && <p role="status" className="rounded-xl border border-border bg-surface p-3 text-sm">{msg}</p>}
      {syncErr && <p role="alert" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{syncErr}</p>}
      {!remote && <p className="rounded-xl border border-border bg-surface p-3 text-xs text-muted">No guardian link exists for this journey, so live updates stay on your device.</p>}

      {geo.state === "idle" && !f && (
        <Card className="space-y-3">
          <p className="text-sm text-muted">Turn on live tracking to follow your position against your route{remote ? " and keep your guardian updated" : ""}. Your browser will ask for location permission.</p>
          <Button size="lg" className="w-full" onClick={start}><LocateFixed className="h-5 w-5" aria-hidden="true" />Start live tracking</Button>
        </Card>
      )}
      {geo.state === "requesting" && !f && (
        <Card className="flex items-center gap-3" role="status"><Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" /><p className="text-sm">Waiting for your device… choose <strong>Allow</strong> if asked.</p></Card>
      )}
      <GeoProblem state={geo.state} onRetry={start} />

      {alertOn && dev && (
        <Card role="alert" className="space-y-3 border-2 border-amber-500/60">
          <p className="text-lg font-semibold">Your route has changed.</p>
          <p className="text-sm text-muted">You appear to be about {fmtDistance(dev.distanceM)} from your planned route. If this is intentional, choose an option below.</p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={keepGoing}>Continue</Button>
            <Button variant="secondary" onClick={recalculate} disabled={recalc}><RefreshCw className={`h-4 w-4 ${recalc ? "animate-spin" : ""}`} aria-hidden="true" />Recalculate</Button>
            <Button variant="secondary" onClick={() => setShowShare((v) => !v)} aria-expanded={showShare}><Share2 className="h-4 w-4" aria-hidden="true" />Share Alert</Button>
            <Button variant="emergency" onClick={endIt}>End Journey</Button>
          </div>
          {showShare && f && (
            <ShareSheet title="Route alert" link={mapsLink(f)} contact={s.contact}
              template={`I've moved away from my planned route to ${j.destinationLabel}.\n\nMy location: [link]${gLink ? `\nFollow my journey: ${gLink}` : ""}\n\nPlease check in with me.`} />
          )}
        </Card>
      )}

      <MiniMap ariaLabel="Map of your planned route, current position and destination" lines={lines} markers={markers} accuracyM={f?.accuracy} height={280} />

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div className={cell}><p className="text-xs text-muted">Destination</p><p className="mt-1 font-medium">{j.destinationLabel}</p></div>
        <div className={cell}><p className="text-xs text-muted">ETA</p><p className="mt-1 font-medium">{eta}</p>{distLeft !== null && <p className="text-xs text-muted">{fmtDistance(distLeft)} to go</p>}</div>
        <div className={cell}><p className="text-xs text-muted">Elapsed</p><p className="mt-1 font-medium tabular-nums">{fmtClock(now - j.startedAt)}</p></div>
        <div className={cell}><p className="text-xs text-muted">Current position</p><p className="mt-1 font-medium tabular-nums">{f ? `${f.lat.toFixed(4)}, ${f.lng.toFixed(4)}` : "—"}</p>{f?.accuracy != null && <p className="text-xs text-muted">± {Math.round(f.accuracy)} m</p>}</div>
        <div className={`${cell} col-span-2`}>
          <p className="text-xs text-muted">Route deviation</p>
          <p className="mt-1 font-medium">
            {!monitored ? "Not monitored — no planned route. Pick one in Safe Routes." : !f ? "Waiting for your location" : !dev ? "Checking…" : dev.uncertain ? "GPS too imprecise to judge right now" : dev.off ? `Off route · about ${fmtDistance(dev.distanceM)} away` : "On planned route"}
          </p>
          <label className="mt-2 flex items-center gap-2 text-xs text-muted">Alert me when more than
            <select value={s.deviationM} onChange={(e) => s.update({ deviationM: Number(e.target.value) })} className="h-8 rounded-lg border border-border bg-surface px-2 text-foreground">
              {THRESHOLDS.map((t) => <option key={t} value={t}>{t} m</option>)}
            </select> from route</label>
        </div>
        <div className={`${cell} col-span-2`}>
          <p className="text-xs text-muted">Battery</p>
          <p className="mt-1 flex items-center gap-1.5 font-medium">
            {battery === undefined ? "Checking…" : battery === null ? "Battery information unavailable on this device."
              : <>{battery.charging ? <BatteryCharging className="h-4 w-4" aria-hidden="true" /> : <Battery className="h-4 w-4" aria-hidden="true" />}{Math.round(battery.level * 100)}%{battery.charging ? " · charging" : ""}</>}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {tracking && <Button variant="secondary" onClick={stop}><ShieldOff className="h-4 w-4" aria-hidden="true" />Stop sharing</Button>}
        <Button variant="ghost" onClick={endIt}>End journey</Button>
      </div>
    </div>
  );
}
