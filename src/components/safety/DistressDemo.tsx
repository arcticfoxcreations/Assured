"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Mic, Phone, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PermissionDeniedState } from "@/components/states/PermissionDeniedState";
import { UnsupportedBrowserState } from "@/components/states/UnsupportedBrowserState";
import { createDetector, dbFromRms, rmsOf, SENSITIVITY, type Sensitivity } from "@/lib/safety/distress";

type Phase = "idle" | "requesting" | "calibrating" | "listening" | "asking" | "help" | "denied" | "unsupported" | "insecure" | "error";

const pct = (db: number) => Math.max(0, Math.min(100, ((db + 80) / 80) * 100));

export function DistressDemo() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sens, setSens] = useState<Sensitivity>("medium");
  const [level, setLevel] = useState(-100);
  const [threshold, setThreshold] = useState<number | null>(null);
  const timer = useRef<number | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const ctx = useRef<AudioContext | null>(null);

  const stopAudio = useCallback(() => {
    if (timer.current !== null) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    void ctx.current?.close().catch(() => undefined);
    ctx.current = null;
  }, []);

  useEffect(() => stopAudio, [stopAudio]);

  async function start() {
    if (!window.isSecureContext) return setPhase("insecure");
    if (!navigator.mediaDevices?.getUserMedia) return setPhase("unsupported");
    setPhase("requesting");
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) {
        s.getTracks().forEach((t) => t.stop());
        return setPhase("unsupported");
      }
      const audio = new Ctor();
      void audio.resume?.();
      const analyser = audio.createAnalyser();
      analyser.fftSize = 2048;
      audio.createMediaStreamSource(s).connect(analyser);
      const buf = new Float32Array(analyser.fftSize);
      stream.current = s;
      ctx.current = audio;
      const det = createDetector(sens);
      setThreshold(null);
      setPhase("calibrating");
      timer.current = window.setInterval(() => {
        analyser.getFloatTimeDomainData(buf);
        const db = dbFromRms(rmsOf(buf));
        const r = det.push(db);
        setLevel(db);
        setThreshold(r.threshold);
        if (r.triggered) {
          stopAudio();
          setPhase("asking");
        } else if (r.phase === "listening") {
          setPhase((p) => (p === "calibrating" ? "listening" : p));
        }
      }, 100);
    } catch (e) {
      const name = (e as { name?: string })?.name;
      setPhase(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
    }
  }

  function stop() {
    stopAudio();
    setPhase("idle");
    setLevel(-100);
    setThreshold(null);
  }

  const running = phase === "calibrating" || phase === "listening";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap gap-2" aria-label="Status of this feature">
        {["Prototype", "Experimental", "Requires microphone permission"].map((t) => (
          <span key={t} className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">{t}</span>
        ))}
      </div>

      <Card className="space-y-2 text-sm">
        <p className="font-medium">What this demo does — and doesn&apos;t</p>
        <ul className="list-disc space-y-1 pl-5 text-muted">
          <li>It only measures how <strong>loud</strong> your surroundings get compared with the background. It can&apos;t recognise screams, words or an assault, and it will miss things and give false alarms.</li>
          <li>Sound is analysed in memory on your device. Nothing is recorded, saved or sent anywhere.</li>
          <li>If it triggers, it only asks you a question. ASSURED never contacts anyone or any authority on its own.</li>
          <li>Not a replacement for calling 112. Keep this page open and the screen on while testing.</li>
        </ul>
      </Card>

      {phase === "denied" && <PermissionDeniedState permission="Microphone" guidance="ASSURED can't hear anything. To try the demo, allow Microphone for this site in your browser's site settings, then reload the page." />}
      {phase === "unsupported" && <UnsupportedBrowserState feature="Microphone access" />}
      {phase === "insecure" && <p role="alert" className="rounded-2xl border border-border bg-surface-2/40 p-4 text-sm">Microphone access only works on a secure (https) connection.</p>}
      {phase === "error" && <p role="alert" className="rounded-2xl border border-border bg-surface-2/40 p-4 text-sm">Your device couldn&apos;t start the microphone. Check that one is connected and not in use by another app, then try again.</p>}

      <Card className="space-y-3">
        <fieldset disabled={running}>
          <legend className="text-xs font-medium text-muted">Sensitivity</legend>
          <div className="mt-1 flex gap-2">
            {(Object.keys(SENSITIVITY) as Sensitivity[]).map((k) => (
              <label key={k} className={`flex-1 cursor-pointer rounded-xl border px-3 py-2 text-center text-sm capitalize ${sens === k ? "border-primary bg-primary/10" : "border-border"}`}>
                <input type="radio" name="sens" className="sr-only" checked={sens === k} onChange={() => setSens(k)} />
                {k}
              </label>
            ))}
          </div>
        </fieldset>

        {running && (
          <div>
            <p className="text-sm" role="status">{phase === "calibrating" ? "Learning your room's background sound for about 2 seconds… stay quiet." : "Listening. A sustained loud sound will trigger the question."}</p>
            <div className="relative mt-2 h-3 overflow-hidden rounded-full bg-surface-2" aria-hidden="true">
              <div className="h-full bg-primary transition-[width] duration-100" style={{ width: `${pct(level)}%` }} />
              {threshold !== null && <div className="absolute top-0 h-full w-0.5 bg-emergency" style={{ left: `${pct(threshold)}%` }} />}
            </div>
            <p className="mt-1 text-[11px] text-muted">Bar: current level. Red line: trigger level.</p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {!running ? (
            <Button onClick={start} disabled={phase === "requesting"}><Mic className="h-4 w-4" aria-hidden="true" />{phase === "requesting" ? "Waiting for permission…" : "Start the demo"}</Button>
          ) : (
            <Button variant="secondary" onClick={stop}><Square className="h-4 w-4" aria-hidden="true" />Stop</Button>
          )}
          <Button variant="outline" onClick={() => { stopAudio(); setPhase("asking"); }}><Play className="h-4 w-4" aria-hidden="true" />Preview the &ldquo;Are you okay?&rdquo; prompt</Button>
        </div>
      </Card>

      {(phase === "asking" || phase === "help") && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-4 sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="dd-title">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-card">
            {phase === "asking" ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Prototype</p>
                <h2 id="dd-title" className="mt-1 text-xl font-semibold">Are you okay?</h2>
                <p className="mt-1 text-sm text-muted">A loud sound was detected. Nobody has been contacted.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button variant="secondary" size="lg" onClick={stop}>I&apos;m Safe</Button>
                  <Button variant="emergency" size="lg" onClick={() => setPhase("help")}>I Need Help</Button>
                </div>
              </>
            ) : (
              <>
                <h2 id="dd-title" className="text-xl font-semibold">Here is how to get help</h2>
                <p className="mt-1 text-sm text-muted">ASSURED has not contacted anyone. Choose what you want to do.</p>
                <div className="mt-4 space-y-2">
                  <Button href="tel:112" variant="emergency" size="lg" className="w-full"><Phone className="h-5 w-5" aria-hidden="true" />Call 112</Button>
                  <Button href="/location/share" variant="secondary" className="w-full">Share my location with someone</Button>
                  <Button href="/travel/check-in" variant="secondary" className="w-full">Start a safety check-in</Button>
                  <Button variant="ghost" className="w-full" onClick={stop}>Close — I&apos;m okay</Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-center text-xs text-muted">Need something that works for real? <Link href="/emergency" className="text-primary underline">Go to Emergency</Link>.</p>
    </div>
  );
}
