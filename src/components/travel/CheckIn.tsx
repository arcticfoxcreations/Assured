"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Clock, LifeBuoy, MapPinned, Phone, Play, ShieldCheck, Timer, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { AlertStatus } from "@/components/travel/AlertStatus";
import { PlaceSearch, type Place } from "@/components/travel/PlaceSearch";
import { ShareSheet } from "@/components/travel/ShareSheet";
import { api, guardianUrl, useNow, useSaved, useServiceStatus, type LocalJourney } from "@/lib/travel/client";
import { fmtClock } from "@/lib/travel/geo";
import type { Mode } from "@/lib/travel/types";
import { cn } from "@/lib/utils";

const PRESETS = [15, 30, 60, 90];
const MODES: { id: Mode; label: string }[] = [{ id: "walking", label: "Walking" }, { id: "driving", label: "Driving / cab" }, { id: "cycling", label: "Cycling" }];
const field = "h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function CheckIn() {
  const s = useSaved();
  const svc = useServiceStatus();
  const now = useNow(1000);

  const [dest, setDest] = useState<Place>({ label: "", pos: null });
  const [mode, setMode] = useState<Mode>("walking");
  const [preset, setPreset] = useState<number | null>(30);
  const [custom, setCustom] = useState("");
  const [cName, setCName] = useState("");
  const [cPhone, setCPhone] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [myName, setMyName] = useState("");
  const [autoAlert, setAutoAlert] = useState(true);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [showShare, setShowShare] = useState(false);

  // Prefill once from the saved contact and any route picked in Safe Routes.
  useEffect(() => {
    if (!s.ready) return;
    if (s.contact) { setCName(s.contact.name); setCPhone(s.contact.phone); setCEmail(s.contact.email ?? ""); }
    if (s.travellerName) setMyName(s.travellerName);
    if (s.draft) { setDest({ label: s.draft.destinationLabel, pos: s.draft.dest }); setMode(s.draft.mode); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.ready]);

  async function start() {
    setErr(""); setNotice("");
    const mins = custom.trim() ? Number(custom) : preset ?? 0;
    if (!dest.label.trim()) return setErr("Enter where you're going.");
    if (!Number.isFinite(mins) || mins < 1 || mins > 1440) return setErr("Expected arrival must be between 1 minute and 24 hours from now.");
    if (!cName.trim()) return setErr("Choose a trusted contact (their name is enough).");
    setBusy(true);
    const contact = { name: cName.trim(), phone: cPhone.trim(), email: cEmail.trim() };
    if (contact.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(contact.email)) { setBusy(false); return setErr("That email address doesn't look right."); }
    s.update({ contact, travellerName: myName.trim() });
    const n = svc?.notifications;
    const wantEmail = Boolean(autoAlert && n?.email && contact.email);
    const wantSms = Boolean(autoAlert && n?.sms && contact.phone);
    const alertTo = wantEmail || wantSms ? { name: contact.name, ...(wantEmail ? { email: contact.email } : {}), ...(wantSms ? { phone: contact.phone } : {}) } : null;
    const startedAt = Date.now();
    const d = s.draft && s.draft.destinationLabel === dest.label ? s.draft : null;
    let j: LocalJourney = {
      destinationLabel: dest.label.trim(), dest: dest.pos ?? d?.dest ?? null, mode, startedAt,
      expectedArrival: startedAt + mins * 60_000, route: d?.route ?? null, routeMeta: d?.routeMeta ?? null,
      status: "active", extensions: 0, sharing: false,
    };
    if (svc && svc.storage !== "none") {
      const r = await api.createJourney({ destinationLabel: j.destinationLabel, dest: j.dest, route: j.route, mode, expectedArrival: j.expectedArrival, travellerName: myName.trim(), alertTo });
      if (r.ok && r.data) {
        j = { ...j, id: r.data.id, ownerKey: r.data.ownerKey, guardianToken: r.data.guardianToken, expiresAt: r.data.expiresAt, alertsOn: r.data.alerts.on };
        if (alertTo && !r.data.alerts.events.started) setNotice("Your journey started, but the “journey started” message to your contact couldn't be confirmed as sent. Alerts will still retry; consider messaging them yourself.");
      } else setNotice(r.error && r.status === 400 ? r.error : "Your journey started on this device, but a guardian link couldn't be created right now.");
    } else {
      setNotice("Your journey started on this device. No guardian link was created because the ASSURED backend isn't connected.");
    }
    s.update({ journey: j, draft: null });
    setBusy(false);
  }

  /* ───────── form ───────── */
  if (!s.ready) return null;
  const j = s.journey;
  if (!j) {
    return (
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
        <div className="space-y-4 rounded-2xl border border-border bg-surface p-4 shadow-card">
          <PlaceSearch id="ci-dest" label="Destination" value={dest} onChange={setDest} />
          <fieldset>
            <legend className="text-sm font-medium">How are you travelling?</legend>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button key={m.id} type="button" aria-pressed={mode === m.id} onClick={() => setMode(m.id)}
                  className={cn("h-11 rounded-xl border text-sm", mode === m.id ? "border-primary bg-primary/10 font-medium" : "border-border")}>{m.label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-medium">Expected arrival — in how long?</legend>
            <div className="mt-1 flex flex-wrap gap-2">
              {PRESETS.map((m) => (
                <button key={m} type="button" aria-pressed={preset === m && !custom} onClick={() => { setPreset(m); setCustom(""); }}
                  className={cn("h-11 rounded-xl border px-4 text-sm", preset === m && !custom ? "border-primary bg-primary/10 font-medium" : "border-border")}>{m} min</button>
              ))}
              <input inputMode="numeric" aria-label="Custom minutes" placeholder="Other (min)" value={custom}
                onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 4))} className="h-11 w-32 rounded-xl border border-border bg-surface px-3 text-sm" />
            </div>
          </fieldset>
          <div><label htmlFor="ci-me" className="block text-sm font-medium">Your name <span className="font-normal text-muted">(shown in alerts)</span></label>
            <input id="ci-me" className={cn(field, "mt-1")} placeholder="e.g. Asha" maxLength={60} value={myName} onChange={(e) => setMyName(e.target.value)} /></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label htmlFor="ci-name" className="block text-sm font-medium">Trusted contact</label>
              <input id="ci-name" className={cn(field, "mt-1")} placeholder="Name" maxLength={60} value={cName} onChange={(e) => setCName(e.target.value)} /></div>
            <div><label htmlFor="ci-phone" className="block text-sm font-medium">Their mobile <span className="font-normal text-muted">(optional)</span></label>
              <input id="ci-phone" className={cn(field, "mt-1")} inputMode="tel" placeholder="10-digit or +country code" maxLength={20} value={cPhone} onChange={(e) => setCPhone(e.target.value)} /></div>
            <div className="sm:col-span-2"><label htmlFor="ci-email" className="block text-sm font-medium">Their email <span className="font-normal text-muted">(optional)</span></label>
              <input id="ci-email" type="email" className={cn(field, "mt-1")} placeholder="name@example.com" maxLength={120} value={cEmail} onChange={(e) => setCEmail(e.target.value)} /></div>
          </div>
          {svc && (svc.notifications.email || svc.notifications.sms) && svc.storage !== "none" ? (
            <label className="flex items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-3 text-sm">
              <input type="checkbox" className="mt-1" checked={autoAlert} onChange={(e) => setAutoAlert(e.target.checked)} />
              <span><span className="font-medium">Alert my contact automatically</span><span className="block text-xs text-muted">
                ASSURED will {svc.notifications.sms && svc.notifications.email ? "SMS / email" : svc.notifications.sms ? "SMS" : "email"} them when you start, if you miss your check-in, if you press Get Help, and when you arrive. Their details are sent to ASSURED&apos;s server for this only and deleted when you arrive or end the journey.</span></span>
            </label>
          ) : (
            <p className="text-xs text-muted">Automatic email/SMS alerts aren&apos;t set up on this deployment, so ASSURED can&apos;t message your contact. Their details stay on this device; you can still send them the guardian link yourself.</p>
          )}
          {err && <p role="alert" className="text-sm text-emergency">{err}</p>}
          <Button size="lg" className="w-full" onClick={start} disabled={busy}><Play className="h-5 w-5" aria-hidden="true" />{busy ? "Starting…" : "Start journey"}</Button>
        </div>
        {s.draft && <p className="text-xs text-muted">Using the route you picked in Safe Routes ({s.draft.destinationLabel}).</p>}
      </div>
    );
  }

  /* ───────── active journey ───────── */
  const remaining = j.expectedArrival - now;
  const total = j.expectedArrival - j.startedAt;
  const promptAt = Math.min(5 * 60_000, total * 0.25);
  const phase = j.status === "arrived" ? "arrived" : j.status === "help" ? "help" : remaining <= 0 ? "overdue" : remaining <= promptAt ? "prompt" : "active";
  const pill = { arrived: "Arrived safely", help: "Help requested", overdue: "Check-in overdue", prompt: "Check-in due", active: "Journey active" }[phase];
  const gLink = j.guardianToken ? guardianUrl(j.guardianToken) : "";
  const remote = Boolean(j.id && j.ownerKey);

  const push = (body: unknown) => (remote ? api.patchJourney(j.id!, j.ownerKey!, body) : Promise.resolve(null));

  async function safe() { s.patchJourney({ status: "arrived", sharing: false }); await push({ status: "arrived" }); }
  async function extend() {
    if (j!.extensions >= 6) return;
    s.patchJourney({ expectedArrival: Math.max(j!.expectedArrival, Date.now()) + 15 * 60_000, extensions: j!.extensions + 1, status: "active" });
    await push({ extendMs: 15 * 60_000 });
  }
  async function help() { s.patchJourney({ status: "help" }); await push({ status: "help" }); }
  async function okNow() { s.patchJourney({ status: "active" }); await push({ status: "active" }); }
  async function endJourney() {
    if (!window.confirm("End this journey? Your guardian link stops working immediately and journey data is removed.")) return;
    if (remote) await api.endJourney(j!.id!, j!.ownerKey!);
    s.update({ journey: null });
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      {notice && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm">{notice}</p>}

      <Card className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs text-muted">Destination</p>
            <p className="flex items-center gap-1.5 font-medium"><MapPinned className="h-4 w-4 text-primary" aria-hidden="true" />{j.destinationLabel}</p>
          </div>
          <span className={cn("shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
            phase === "arrived" ? "border-safe/40 bg-safe/10 text-safe" : phase === "help" || phase === "overdue" ? "border-emergency/40 bg-emergency/10 text-emergency" : phase === "prompt" ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400" : "border-primary/40 bg-primary/10 text-primary")}>{pill}</span>
        </div>
        {phase !== "arrived" && (
          <div className="rounded-xl bg-surface-2/60 p-4 text-center" role="timer" aria-live="off">
            <p className="text-xs text-muted">{remaining > 0 ? "Time remaining" : "Overdue by"}</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{fmtClock(Math.abs(remaining))}</p>
            <p className="mt-1 text-xs text-muted"><Clock className="mr-1 inline h-3 w-3" aria-hidden="true" />Expected by {hhmm(j.expectedArrival)}</p>
          </div>
        )}
      </Card>

      {(phase === "prompt" || phase === "overdue") && (
        <Card role="alert" className={cn("space-y-3 border-2", phase === "overdue" ? "border-emergency/50" : "border-amber-500/50")}>
          <p className="flex items-center gap-2 text-lg font-semibold"><AlertTriangle className="h-5 w-5" aria-hidden="true" />{phase === "overdue" ? "Time's up — have you arrived safely?" : "Have you arrived safely?"}</p>
          {phase === "overdue" && (
            <p className="text-sm text-muted">
              {remote ? "Your guardian's link now shows “Check-in overdue”. " : ""}
              {j.alertsOn ? "Your contact is being alerted automatically — see the alert status below. " : "Automatic alerts are off, so nobody has been messaged for you. "}
              {remote ? "Tap “I'm Safe” to clear it." : "Message your contact yourself."}
            </p>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={safe}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />I&apos;m Safe</Button>
            <Button variant="secondary" onClick={extend} disabled={j.extensions >= 6}><Timer className="h-4 w-4" aria-hidden="true" />Extend Time (+15 min)</Button>
            <Button variant="emergency" onClick={help}><LifeBuoy className="h-4 w-4" aria-hidden="true" />Get Help</Button>
          </div>
        </Card>
      )}

      {phase === "active" && (
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={safe}><CheckCircle2 className="h-4 w-4" aria-hidden="true" />I&apos;m Safe</Button>
          <Button variant="secondary" onClick={extend} disabled={j.extensions >= 6}><Timer className="h-4 w-4" aria-hidden="true" />+15 min</Button>
          <Button variant="emergency" onClick={help}><LifeBuoy className="h-4 w-4" aria-hidden="true" />Get Help</Button>
        </div>
      )}

      {phase === "help" && (
        <Card className="space-y-3 border-2 border-emergency/50" role="alert">
          <p className="text-lg font-semibold">Get help now</p>
          <p className="text-sm text-muted">{remote ? "Your guardian's link now shows that you asked for help. " : ""}If you are in danger, call 112 first.</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Button variant="emergency" size="lg" href="tel:112"><Phone className="h-5 w-5" aria-hidden="true" />Call 112</Button>
            <Button variant="secondary" size="lg" href="/location/share">Share my location</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" href="/helplines">More helplines</Button>
            <Button variant="outline" size="sm" onClick={okNow}>I&apos;m okay now</Button>
          </div>
        </Card>
      )}

      {phase === "arrived" && (
        <Card className="space-y-3">
          <p className="flex items-center gap-2 font-semibold text-safe"><ShieldCheck className="h-5 w-5" aria-hidden="true" />Glad you arrived safely</p>
          <p className="text-sm text-muted">{remote ? "Your guardian can see “Arrived safely” for another hour. Your route and last location have already been removed from the server." : "This journey was only stored on this device."}</p>
          <Button onClick={endJourney} variant="secondary">Finish and clear journey</Button>
        </Card>
      )}

      {phase !== "arrived" && (
        <>
          <Card className="space-y-3">
            <p className="font-medium">Guardian · {s.contact?.name || "Trusted contact"}</p>
            {remote && <AlertStatus id={j.id!} ownerKey={j.ownerKey!} name={s.contact?.name ?? ""} enabled={Boolean(j.alertsOn)} overdue={phase === "overdue"} />}
            {remote ? (
              <>
                <p className="text-sm text-muted">
                  Guardian link is active until {hhmm(j.expiresAt ?? j.expectedArrival)}. They see your live status when they open it, and it changes to “Check-in overdue”
                  by itself if you haven&apos;t checked in by {hhmm(j.expectedArrival)} — even if your phone is off.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowShare((v) => !v)} aria-expanded={showShare}>{showShare ? "Hide sharing options" : "Send guardian link"}</Button>
                {showShare && (
                  <ShareSheet title="Follow my journey" link={gLink} linkLabel="Copy Link" contact={s.contact}
                    template={`I've started a journey to ${j.destinationLabel} and expect to arrive by ${hhmm(j.expectedArrival)}.\n\nYou can follow my status here: [link]\n\nThe link expires automatically. If I haven't checked in, please call me.`} />
                )}
              </>
            ) : (
              <p className="text-sm text-muted">No guardian link exists for this journey (the backend isn&apos;t connected), so {s.contact?.name || "your contact"} can&apos;t follow it. Your timer still works on this device — message them yourself when you arrive.</p>
            )}
          </Card>

          <Card className="space-y-2">
            <p className="font-medium">Live location</p>
            <p className="text-sm text-muted">
              Tracking only runs while the live tracking page is open on your screen — ASSURED cannot track you in the background, and can only prompt you while this page is open.
            </p>
            <Button variant="outline" size="sm" href="/travel/guardian">Open live tracking</Button>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" size="sm" onClick={endJourney}><Trash2 className="h-4 w-4" aria-hidden="true" />End journey</Button>
            <Link href="/emergency" className="inline-flex h-9 items-center px-3 text-sm text-muted underline">Nearby help</Link>
          </div>
        </>
      )}
    </div>
  );
}
