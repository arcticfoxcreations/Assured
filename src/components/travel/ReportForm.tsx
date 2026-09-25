"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ImageOff, Loader2, LocateFixed, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GeoProblem } from "@/components/travel/GeoProblem";
import { PlaceSearch, type Place } from "@/components/travel/PlaceSearch";
import { ServiceNotice } from "@/components/travel/ServiceNotice";
import { api, useGeolocation } from "@/lib/travel/client";
import { CATEGORIES } from "@/lib/travel/types";

const localInput = (ms: number) => new Date(ms - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const field = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";

export function ReportForm() {
  const geo = useGeolocation();
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [place, setPlace] = useState<Place>({ label: "", pos: null });
  const [when, setWhen] = useState(() => localInput(Date.now()));
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  function locateHere() { geo.once(); }
  const fix = geo.fix;
  useEffect(() => {
    if (fix) setPlace({ label: "My location", pos: { lat: fix.lat, lng: fix.lng } });
  }, [fix]);

  async function submit() {
    setErr("");
    if (!category) return setErr("Choose a category.");
    if (description.trim().length < 10) return setErr("Add a short description (at least 10 characters).");
    if (!place.pos) return setErr("Set a location: use your location or search a place, then pick a result.");
    const occurredAt = new Date(when).getTime();
    if (!Number.isFinite(occurredAt)) return setErr("Enter when this happened.");
    setBusy(true);
    const r = await api.submitReport({ category, description, lat: place.pos.lat, lng: place.pos.lng, occurredAt, website });
    setBusy(false);
    if (r.ok) { setDone(true); geo.stop(); return; }
    setErr(r.status === 0 ? "You appear to be offline." : r.status === 503 ? "Reports can't be saved yet: the ASSURED backend isn't connected." : r.error ?? "Couldn't submit right now.");
  }

  if (done) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Card className="space-y-3 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-safe" aria-hidden="true" />
          <p className="font-medium">Thank you — your report is on the safety map</p>
          <p className="text-sm text-muted">It appears within about 100 m of the spot you chose, with no name or account attached. Other people can flag it if it identifies someone or is misleading.</p>
          <div className="flex justify-center gap-2"><Button href="/safety-map">View safety map</Button><Button variant="outline" onClick={() => { setDone(false); setDescription(""); setCategory(""); setPlace({ label: "", pos: null }); }}>Report another</Button></div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <ServiceNotice need={["storage"]} />
      <Card className="flex gap-3 border-amber-500/30 bg-amber-500/10">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <p className="text-sm">Describe the <strong>place or situation</strong> — never a person. Don&apos;t include names, phone numbers, vehicle numbers, photos of people or accusations. For a crime in progress or an emergency, call 112 instead. To report a crime, use the <Link className="underline" href="/report">Report Center</Link>.</p>
      </Card>
      <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
        <div>
          <label htmlFor="rp-cat" className="block text-sm font-medium">Category</label>
          <select id="rp-cat" value={category} onChange={(e) => setCategory(e.target.value)} className={`${field} mt-1`}>
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="rp-desc" className="block text-sm font-medium">What&apos;s the concern?</label>
          <textarea id="rp-desc" rows={4} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Street lights have been out along this lane for two weeks." className="mt-1 w-full rounded-xl border border-border bg-surface p-3 text-sm" />
          <p className="mt-1 text-right text-xs text-muted">{description.length}/500</p>
        </div>
        <div>
          <PlaceSearch id="rp-place" label="Location" value={place} onChange={setPlace} />
          <button type="button" onClick={locateHere} disabled={geo.state === "requesting"} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
            {geo.state === "requesting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" aria-hidden="true" />}Use my location
          </button>
          <p className="mt-1 text-xs text-muted">Public pins are rounded to about 100 m so they never mark an exact doorstep.</p>
        </div>
        <GeoProblem state={geo.state} onRetry={locateHere} />
        <div>
          <label htmlFor="rp-when" className="block text-sm font-medium">When did this happen?</label>
          <input id="rp-when" type="datetime-local" value={when} max={localInput(Date.now())} min={localInput(Date.now() - 29 * 86_400_000)} onChange={(e) => setWhen(e.target.value)} className={`${field} mt-1`} />
        </div>
        <div className="flex gap-3 rounded-xl bg-surface-2/60 p-3 text-xs text-muted">
          <ImageOff className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p>Photo and video attachments aren&apos;t available yet — they need secure storage and face-blurring that aren&apos;t set up. Please describe what you saw in words.</p>
        </div>
        <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
          <label>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
        </div>
        {err && <p role="alert" className="text-sm text-emergency">{err}</p>}
        <Button size="lg" className="w-full" onClick={submit} disabled={busy}>{busy ? "Submitting…" : "Submit report"}</Button>
        <p className="text-xs text-muted">No account or name is attached. Reports stay for 180 days, then are deleted automatically.</p>
      </div>
    </div>
  );
}
