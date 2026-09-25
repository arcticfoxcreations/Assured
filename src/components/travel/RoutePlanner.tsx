"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Info, Loader2, LocateFixed, Route as RouteIcon, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GeoProblem } from "@/components/travel/GeoProblem";
import { MiniMap, type MapLine, type MapMarker } from "@/components/travel/MiniMap";
import { PlaceSearch, type Place } from "@/components/travel/PlaceSearch";
import { ServiceNotice } from "@/components/travel/ServiceNotice";
import { api, useGeolocation, useSaved } from "@/lib/travel/client";
import { boundsOf, fmtDistance, fmtDuration, padBounds } from "@/lib/travel/geo";
import { PROFILE_LABEL, pickProfiles, scoreRoute, type Indicator, type Profile, type ScoredRoute } from "@/lib/travel/scoring";
import type { Mode, PublicReport, Resource } from "@/lib/travel/types";
import { cn } from "@/lib/utils";

const MODES: { id: Mode; label: string }[] = [{ id: "walking", label: "Walking" }, { id: "driving", label: "Driving / cab" }, { id: "cycling", label: "Cycling" }];
const PROFILES: Profile[] = ["fastest", "safety", "balanced"];

function IndicatorRow({ i }: { i: Indicator }) {
  const Icon = i.tone === "positive" ? ShieldCheck : i.tone === "caution" ? AlertTriangle : Info;
  const color = i.tone === "positive" ? "text-safe" : i.tone === "caution" ? "text-amber-600 dark:text-amber-400" : "text-muted";
  return (
    <li className="flex gap-2.5">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", color)} aria-hidden="true" />
      <span className="text-sm"><span className="font-medium">{i.label}</span><span className="block text-xs text-muted">{i.why}</span></span>
    </li>
  );
}

export function RoutePlanner() {
  const router = useRouter();
  const { update } = useSaved();
  const geo = useGeolocation();
  const [from, setFrom] = useState<Place>({ label: "", pos: null });
  const [to, setTo] = useState<Place>({ label: "", pos: null });
  const [mode, setMode] = useState<Mode>("walking");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [result, setResult] = useState<null | {
    picks: Record<Profile, ScoredRoute>; all: ScoredRoute[]; reports: PublicReport[]; resources: Resource[];
    notes: string[]; fromPos: NonNullable<Place["pos"]>; toPos: NonNullable<Place["pos"]>;
  }>(null);
  const [sel, setSel] = useState<Profile>("safety");

  function locateMe() { geo.once(); }
  const fix = geo.fix;
  useEffect(() => {
    if (fix) setFrom({ label: "My location", pos: { lat: fix.lat, lng: fix.lng } });
  }, [fix]);

  async function compare() {
    setErr(""); setResult(null);
    if (!from.pos || !to.pos) return setErr("Pick both a start and a destination from the search results (or paste coordinates).");
    setBusy(true);
    const r = await api.route(from.pos, to.pos, mode);
    if (!r.ok || !r.data) {
      setBusy(false);
      return setErr(r.status === 501 ? "Route planning isn't set up on this deployment yet, so routes can't be calculated." : r.status === 0 ? "You appear to be offline." : r.error ?? "No route found.");
    }
    const routes = r.data.routes;
    const b = padBounds(boundsOf(routes.flatMap((x) => x.coords)), 400);
    const notes: string[] = [];
    let reports: PublicReport[] = [], resources: Resource[] = [];
    if (b.north - b.south <= 0.6 && b.east - b.west <= 0.6) {
      const [rp, rs] = await Promise.all([api.reports(b), api.resources(b)]);
      if (rp.ok && rp.data) reports = rp.data.reports; else notes.push("Community reports weren't available, so they aren't part of these indicators.");
      if (rs.ok && rs.data) resources = rs.data.resources; else notes.push("Emergency-resource data wasn't available, so it isn't part of these indicators.");
    } else notes.push("This trip is too long to check for nearby reports and resources.");
    const fastest = [...routes].sort((a, c) => a.durationS - c.durationS)[0];
    const now = Date.now(), hour = new Date().getHours();
    const all = routes.map((x) => scoreRoute(x, fastest, reports, resources, now, hour));
    if (routes.length === 1) notes.push("Only one route option was available for this trip, so all three profiles use it.");
    setResult({ picks: pickProfiles(all), all, reports, resources, notes, fromPos: from.pos, toPos: to.pos });
    setSel("safety");
    setBusy(false);
  }

  const chosen = result?.picks[sel];
  const lines: MapLine[] = result && chosen
    ? [...result.all.filter((x) => x.id !== chosen.id).map((x) => ({ coords: x.coords, tone: "muted" as const, dashed: true })), { coords: chosen.coords, tone: "primary" as const }]
    : [];
  const markers: MapMarker[] = result
    ? [
        { pos: result.fromPos, kind: "start", label: "Start" },
        { pos: result.toPos, kind: "dest", label: "Destination" },
        ...result.reports.slice(0, 60).map((x) => ({ pos: x, kind: "report" as const, label: "Community report" })),
        ...result.resources.slice(0, 60).map((x) => ({ pos: x, kind: "resource" as const, label: `${x.name} (${x.kind.replace("_", " ")})` })),
      ]
    : [];

  function startWith(p: ScoredRoute) {
    update({ draft: { destinationLabel: to.label, dest: to.pos, mode, route: p.coords, routeMeta: { distanceM: p.distanceM, durationS: p.durationS, source: "routing" } } });
    router.push("/travel/check-in");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <ServiceNotice need={["routing"]} />
      <Card className="space-y-4">
        <div>
          <PlaceSearch id="rt-from" label="From" value={from} onChange={setFrom} />
          <button type="button" onClick={locateMe} disabled={geo.state === "requesting"} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            {geo.state === "requesting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}Use my location
          </button>
        </div>
        <GeoProblem state={geo.state} onRetry={locateMe} />
        <PlaceSearch id="rt-to" label="To" value={to} onChange={setTo} />
        <fieldset>
          <legend className="text-sm font-medium">Travelling by</legend>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {MODES.map((m) => (
              <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}
                className={cn("h-11 rounded-xl border text-sm", mode === m.id ? "border-primary bg-primary/10 font-medium" : "border-border")}>{m.label}</button>
            ))}
          </div>
        </fieldset>
        {err && <p role="alert" className="text-sm text-emergency">{err}</p>}
        <Button size="lg" className="w-full" onClick={compare} disabled={busy}>
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <RouteIcon className="h-5 w-5" aria-hidden="true" />}{busy ? "Comparing…" : "Compare routes"}
        </Button>
      </Card>

      {result && chosen && (
        <>
          <div role="tablist" aria-label="Route profile" className="grid grid-cols-3 gap-2">
            {PROFILES.map((p) => {
              const r = result.picks[p];
              return (
                <button key={p} role="tab" aria-selected={sel === p} onClick={() => setSel(p)}
                  className={cn("rounded-xl border p-3 text-left", sel === p ? "border-primary bg-primary/10" : "border-border bg-surface")}>
                  <span className="block text-sm font-medium">{PROFILE_LABEL[p]}</span>
                  <span className="block text-xs text-muted">{fmtDuration(r.durationS)} · {fmtDistance(r.distanceM)}</span>
                </button>
              );
            })}
          </div>

          <MiniMap ariaLabel={`Map of the ${PROFILE_LABEL[sel]} route with nearby community reports and emergency resources`} lines={lines} markers={markers} height={280} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            <span>Circle: start</span><span>Square: destination</span><span>Triangle: community report</span><span>Plus: emergency resource</span>
          </p>

          <Card className="space-y-3">
            <div>
              <p className="font-medium">Why this route got these indicators</p>
              {PROFILES.filter((p) => p !== sel && result.picks[p].id === chosen.id).length > 0 && (
                <p className="text-xs text-muted">Also the {PROFILES.filter((p) => p !== sel && result.picks[p].id === chosen.id).map((p) => PROFILE_LABEL[p]).join(" and ")} option.</p>
              )}
            </div>
            <ul className="space-y-3">{chosen.indicators.map((i) => <IndicatorRow key={i.id} i={i} />)}</ul>
            <Button className="w-full" onClick={() => startWith(chosen)}>Start journey with this route</Button>
          </Card>

          {result.notes.map((n) => <p key={n} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">{n}</p>)}
          <Card className="bg-surface-2/50 text-xs text-muted">
            <p><strong className="text-foreground">ASSURED analysis, not a safety rating.</strong> Indicators compare routes using {result.reports.length} community report{result.reports.length === 1 ? "" : "s"} (unverified), {result.resources.length} mapped emergency resource{result.resources.length === 1 ? "" : "s"} (OpenStreetMap, possibly incomplete) and the time of day. Your mapping provider does not say which route is safest, and neither do we — nothing here guarantees safety.</p>
          </Card>
        </>
      )}
    </div>
  );
}
