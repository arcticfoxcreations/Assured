"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, Copy, FolderPlus, Search, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { nationalHelplines } from "@/lib/helplines";
import { FLOWS } from "@/lib/mewvi/flows";
import { analyseScam, type ScamCheck } from "@/lib/safety/scamCheck";
import { addNoteEntry } from "@/lib/evidence/store";
import { nowLocal } from "@/lib/evidence/model";

const field = "h-11 w-full rounded-xl border border-border bg-background px-3 text-sm";
const area = "min-h-[88px] w-full rounded-xl border border-border bg-background px-3 py-2 text-sm";
const label = "mb-1 block text-xs font-medium text-muted";

export function ScamCallHelper() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<ScamCheck | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState<"" | "ok" | "fail">("");

  const helplines = nationalHelplines.filter((h) => ["cybercrime-1930", "ncrp-portal"].includes(h.id));
  const steps = FLOWS.flow_scam_call?.steps ?? [];
  const hasInput = Boolean(phone.trim() || message.trim() || description.trim());
  const urgentFlag = result?.flags.some((f) => ["otp", "payment", "remote"].includes(f.id));

  function notes(): string {
    return [
      "Suspicious call / message notes (prepared with ASSURED)",
      `Number or sender: ${phone.trim() || "not provided"}`,
      `Message text: ${message.trim() || "not provided"}`,
      `What happened: ${description.trim() || "not provided"}`,
      result && result.flags.length ? `Red flags I noticed: ${result.flags.map((f) => f.label).join("; ")}` : "",
    ].filter(Boolean).join("\n");
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(notes());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* the notes are visible on screen; nothing else to do */
    }
  }

  function save() {
    const ok = addNoteEntry("scam-call", {
      at: nowLocal(),
      title: "Suspicious call or message",
      text: notes().split("\n").slice(1).join("\n"),
    });
    setSaved(ok ? "ok" : "fail");
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <Card className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">A website can&apos;t screen your calls</p>
          <FeatureStatusBadge status="browser-limit" />
        </div>
        <p className="text-sm text-muted">
          ASSURED runs in your browser, so it can&apos;t see, block or identify ordinary phone calls. What it can do is look at what you tell it about a call or message, point out common warning signs, and guide you to the official places to report. What you type is checked on your device and isn&apos;t sent anywhere.
        </p>
      </Card>

      <Card className="space-y-3">
        <div>
          <label className={label} htmlFor="sc-phone">Phone number or sender (optional)</label>
          <input id="sc-phone" type="tel" inputMode="tel" className={field} maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="sc-msg">Message you received (optional)</label>
          <textarea id="sc-msg" className={area} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div>
          <label className={label} htmlFor="sc-desc">What did the caller say or ask for? (optional)</label>
          <textarea id="sc-desc" className={area} maxLength={2000} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <Button onClick={() => { setResult(analyseScam({ phone, message, description })); setSaved(""); }} disabled={!hasInput}>
          <Search className="h-4 w-4" aria-hidden="true" />Look for warning signs
        </Button>
      </Card>

      {result && (
        <Card className="space-y-3" role="region" aria-label="Warning signs found">
          {result.flags.length === 0 ? (
            <p className="text-sm">I didn&apos;t find any common warning signs in what you entered. That doesn&apos;t mean it&apos;s genuine — if you&apos;re unsure, don&apos;t act on it and check through the official app or number on your card or bill.</p>
          ) : (
            <>
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
                {result.level === "many" ? "Several warning signs" : "Some warning signs"}
              </p>
              <ul className="space-y-2">
                {result.flags.map((f) => (
                  <li key={f.id} className="rounded-xl border border-border p-3 text-sm">
                    <p className="font-medium">{f.label}</p>
                    <p className="mt-0.5 text-xs text-muted">{f.why}</p>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted">This is a set of common patterns, not a verdict. I can&apos;t tell for certain whether a call or message is genuine.</p>
            </>
          )}
          {result.numberNotes.length > 0 && (
            <ul className="space-y-1 text-xs text-muted">
              {result.numberNotes.map((n) => <li key={n}>{n}</li>)}
            </ul>
          )}
          {urgentFlag && (
            <div role="alert" className="rounded-xl border border-emergency/40 bg-emergency/10 p-3 text-sm">
              If you have already paid, shared an OTP or PIN, or installed an app they asked for, call 1930 now, then call your bank using the number on your card or in your bank app.
            </div>
          )}
        </Card>
      )}

      <Card>
        <p className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />What to do</p>
        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm text-muted">
          {steps.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </Card>

      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">Official reporting options</p>
        {helplines.map((h) => <HelplineCard key={h.id} helpline={h} />)}
        <div className="grid gap-2 sm:grid-cols-2">
          <Link href="/report/financial-fraud" className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:bg-surface-2">Financial fraud guide<ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" /></Link>
          <Link href="/report/cyber" className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm hover:bg-surface-2">Cybercrime guide<ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" /></Link>
        </div>
        <p className="text-xs text-muted">ASSURED never files a report for you. Use these to report it yourself.</p>
      </div>

      {hasInput && (
        <Card className="space-y-3">
          <p className="font-medium">Keep your notes</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={copy}>{copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}{copied ? "Copied" : "Copy notes for a complaint"}</Button>
            <Button size="sm" variant="secondary" onClick={save}><FolderPlus className="h-4 w-4" aria-hidden="true" />Save to Evidence Organizer</Button>
          </div>
          {saved === "ok" && <p role="status" className="text-xs text-muted">Saved on this device. <Link href="/evidence?category=scam-call" className="text-primary underline">Open the Evidence Organizer</Link></p>}
          {saved === "fail" && <p role="alert" className="text-xs text-emergency">This browser couldn&apos;t save it. Use Copy instead.</p>}
        </Card>
      )}
    </div>
  );
}
