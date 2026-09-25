"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, Flag, Landmark, Loader2, LocateFixed, MapPinned, Users } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/states/EmptyState";
import { GeoProblem } from "@/components/travel/GeoProblem";
import { MiniMap, type MapMarker } from "@/components/travel/MiniMap";
import { PlaceSearch, type Place } from "@/components/travel/PlaceSearch";
import { ServiceNotice } from "@/components/travel/ServiceNotice";
import { api, useGeolocation } from "@/lib/travel/client";
import { fmtDistance, haversineM, padBounds } from "@/lib/travel/geo";
import { isNight } from "@/lib/travel/scoring";
import { CATEGORIES, type LatLng, type PublicReport, type Resource } from "@/lib/travel/types";
import { getSource, nationalHelplines, telHref } from "@/lib/helplines";
import { cn } from "@/lib/utils";

const DAY = 86_400_000;
const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
const dt = (ms: number) => new Date(ms).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const OFFICIAL_IDS = ["erss-112", "women-181", "nhai-1033", "railmadad-139"];

/** The three layers must never be visually confused: each has its own label + icon. */
function LayerBadge({ kind }: { kind: "official" | "community" | "analysis" }) {
  const c = {
    official: { t: "OFFICIAL DATA", I: Landmark, cls: "border-primary/40 text-primary" },
    community: { t: "COMMUNITY REPORTS", I: Users, cls: "border-amber-500/50 text-amber-700 dark:text-amber-400" },
    analysis: { t: "ASSURED ANALYSIS", I: Activity, cls: "border-border text-muted" },
  }[kind];
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide", c.cls)}><c.I className="h-3.5 w-3.5" aria-hidden="true" />{c.t}</span>;
}

export function AreaSafety({ mode }: { mode: "map" | "area" }) {
  const geo = useGeolocation();
  const [place, setPlace] = useState<Place>({ label: "", pos: null });
  const [center, setCenter] = useState<LatLng | null>(null);
  const [radius, setRadius] = useState(1000);
  const [layers, setLayers] = useState({ reports: true, resources: true });
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [notes, setNotes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [flagMsg, setFlagMsg] = useState("");

  useEffect(() => { if (place.pos) setCenter(place.pos); }, [place.pos]);
  useEffect(() => {
    if (geo.fix) { const p = { lat: geo.fix.lat, lng: geo.fix.lng }; setCenter(p); setPlace({ label: "My location", pos: p }); }
  }, [geo.fix]);

  useEffect(() => {
    if (!center) return;
    let live = true;
    setLoading(true);
    const b = padBounds({ south: center.lat, north: center.lat, west: center.lng, east: center.lng }, radius);
    Promise.all([api.reports(b), api.resources(b)]).then(([rp, rs]) => {
      if (!live) return;
      const n: string[] = [];
      setReports(rp.ok && rp.data ? rp.data.reports : []);
      setResources(rs.ok && rs.data ? rs.data.resources : []);
      if (!rp.ok) n.push(rp.status === 503 ? "Community reports are unavailable: the ASSURED backend isn't connected yet." : "Community reports couldn't be loaded right now.");
      if (!rs.ok) n.push("Emergency resource data couldn't be loaded right now.");
      setNotes(n);
      setLoading(false);
    });
    return () => { live = false; };
  }, [center, radius]);

  const inArea = useMemo(() => (center ? reports.filter((r) => haversineM(center, r) <= radius && !flagged.has(r.id)).sort((a, b) => b.occurredAt - a.occurredAt) : []), [reports, center, radius, flagged]);
  const resInArea = useMemo(() => (center ? resources.filter((r) => haversineM(center, r) <= radius).sort((a, b) => haversineM(center, a) - haversineM(center, b)) : []), [resources, center, radius]);

  const markers: MapMarker[] = center
    ? [
        { pos: center, kind: geo.fix ? "you" : "start", label: geo.fix ? "Your location" : "Search centre" },
        ...(layers.reports ? inArea.slice(0, 80).map((r) => ({ pos: r, kind: "report" as const, label: `${catLabel(r.category)} (community report)` })) : []),
        ...(layers.resources ? resInArea.slice(0, 80).map((r) => ({ pos: r, kind: "resource" as const, label: `${r.name} (${r.kind.replace("_", " ")})` })) : []),
      ]
    : [];

  async function flag(id: string) {
    const r = await api.flagReport(id);
    setFlagMsg(r.ok ? "Thanks — reported. A report flagged by several people is hidden until it can be reviewed." : "Couldn't send that right now. Please try again.");
    if (r.ok) setFlagged((s) => new Set(s).add(id));
  }

  const now = Date.now();
  const last30 = inArea.filter((r) => now - r.occurredAt <= 30 * DAY).length;
  const byCat = Object.entries(inArea.reduce<Record<string, number>>((m, r) => ((m[r.category] = (m[r.category] ?? 0) + 1), m), {})).sort((a, b) => b[1] - a[1]).slice(0, 3);
  const nearest = resInArea[0] ?? null;
  const official = nationalHelplines.filter((h) => OFFICIAL_IDS.includes(h.id));

  const reportList = (
    <section aria-labelledby="sec-comm" className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2"><h2 id="sec-comm" className="sr-only">Community reports</h2><LayerBadge kind="community" /><Link href="/community" className="text-sm underline">Report something</Link></div>
      <p className="text-xs text-muted">Submitted by ASSURED users. Unverified, approximate (within about 100 m) and never checked against police records.</p>
      {flagMsg && <p role="status" className="text-xs">{flagMsg}</p>}
      {inArea.length === 0 ? <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted">No community reports in this area. That does not mean the area is safe — only that nobody has reported here on ASSURED.</p> : (
        <ul className="space-y-2">
          {inArea.slice(0, 20).map((r) => (
            <li key={r.id} className="rounded-xl border border-border bg-surface p-3">
              <p className="text-sm font-medium">{catLabel(r.category)}</p>
              <p className="mt-1 text-sm">{r.description}</p>
              <p className="mt-1 text-xs text-muted">Happened {dt(r.occurredAt)} · reported {dt(r.createdAt)} · {fmtDistance(haversineM(center!, r))} from centre</p>
              <button type="button" onClick={() => flag(r.id)} className="mt-2 inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs hover:bg-surface-2"><Flag className="h-3.5 w-3.5" aria-hidden="true" />Report abuse</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <Card className="space-y-3">
        <PlaceSearch id="am-place" label={mode === "area" ? "Area" : "Search a place"} value={place} onChange={setPlace} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={geo.once} disabled={geo.state === "requesting"} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            {geo.state === "requesting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}Use my location
          </button>
          <label className="flex items-center gap-2 text-sm text-muted">Radius
            <select value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="h-9 rounded-lg border border-border bg-surface px-2 text-foreground">
              {[500, 1000, 2000, 5000].map((r) => <option key={r} value={r}>{fmtDistance(r)}</option>)}
            </select>
          </label>
        </div>
      </Card>
      <GeoProblem state={geo.state} onRetry={geo.once} />
      <ServiceNotice need={["storage"]} />

      {!center ? (
        <EmptyState icon={MapPinned} title="Choose an area" description="Search for a place or use your location. ASSURED only reads your location when you tap the button." />
      ) : (
        <>
          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={layers.reports} onChange={(e) => setLayers((l) => ({ ...l, reports: e.target.checked }))} />Community reports</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={layers.resources} onChange={(e) => setLayers((l) => ({ ...l, resources: e.target.checked }))} />Emergency resources</label>
            {loading && <span className="flex items-center gap-1.5 text-xs text-muted" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</span>}
          </div>
          <MiniMap ariaLabel="Safety map showing community reports and emergency resources in the selected area" markers={markers} height={mode === "map" ? 340 : 240} />
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted"><span>Triangle: community report</span><span>Plus: emergency resource (OpenStreetMap)</span><span>Circle: centre</span></p>
          {notes.map((n) => <p key={n} className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">{n}</p>)}

          {mode === "map" ? (
            <>
              {reportList}
              <Link href="/safety-map/area" className="block rounded-xl border border-border bg-surface p-4 text-sm font-medium hover:bg-surface-2">See the full area breakdown — official data, reports and ASSURED analysis →</Link>
            </>
          ) : (
            <>
              <section aria-labelledby="sec-off" className="space-y-3">
                <h2 id="sec-off" className="sr-only">Official data</h2><LayerBadge kind="official" />
                <p className="text-xs text-muted">Nationwide emergency numbers from ASSURED&apos;s verified helpline list (source and date on the Helplines page). No official area-level crime or incident dataset is connected to ASSURED, so none is shown here.</p>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {official.map((h) => (
                    <li key={h.id} className="rounded-xl border border-border bg-surface p-3">
                      <p className="text-sm font-medium">{h.name}</p>
                      <a className="text-lg font-semibold text-primary" href={telHref(h.number)}>{h.number}</a>
                      <p className="text-xs text-muted">Verified {getSource(h.sourceId)?.verifiedOn ?? h.verifiedOn}</p>
                    </li>
                  ))}
                </ul>
              </section>

              {reportList}

              <section aria-labelledby="sec-an" className="space-y-3">
                <h2 id="sec-an" className="sr-only">ASSURED analysis</h2><LayerBadge kind="analysis" />
                <Card className="space-y-2 text-sm">
                  <p className="text-xs text-muted">Derived by ASSURED from the community reports and map data above. It is not an official assessment and not a measure of how safe the area is.</p>
                  <ul className="list-disc space-y-1.5 pl-5">
                    <li>{inArea.length} community report{inArea.length === 1 ? "" : "s"} within {fmtDistance(radius)} ({last30} in the last 30 days).{byCat.length > 0 && ` Most common: ${byCat.map(([c, n]) => `${catLabel(c).toLowerCase()} (${n})`).join(", ")}.`}</li>
                    <li>{nearest && center ? `Nearest mapped ${nearest.kind.replace("_", " ")}: ${nearest.name}, about ${fmtDistance(haversineM(center, nearest))} from the centre. ${resInArea.length} mapped in total (OpenStreetMap, may be incomplete).` : "No police station, hospital or fire station is mapped within this radius (OpenStreetMap data may be incomplete)."}</li>
                    <li>{isNight(new Date().getHours()) ? "It is currently night — prefer busy, well-lit routes." : "It is currently daytime. Conditions can change after dark."}</li>
                    <li>Not factored in: street lighting, crowd levels and official crime statistics — ASSURED has no reliable source for them.</li>
                  </ul>
                </Card>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
