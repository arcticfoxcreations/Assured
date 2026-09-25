"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Siren,
  MapPin,
  Users,
  Navigation,
  PhoneCall,
  CheckCircle2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/**
 * ASSURED — Guided Demo Mode
 *
 * A scripted, judge-ready walkthrough of the core safety flow:
 * Start journey → destination → guardian → route → (simulated) route
 * deviation → Mewvi check-in → "I need help" → location sharing →
 * guardian dashboard → emergency options.
 *
 * Every state change here is local component state. Nothing here calls
 * a real API, contacts a real guardian, or dials emergency services on
 * its own — the presenter stays in control of every step, and the one
 * real-world action available (calling 112) only opens the phone's own
 * dialer, which still requires the presenter to press call.
 */

const STEPS = [
  "intro",
  "destination",
  "guardian",
  "route",
  "journey",
  "deviation",
  "mewvi",
  "help",
  "sharing",
  "guardianView",
  "emergency",
] as const;

type Step = (typeof STEPS)[number];

function DemoBanner() {
  return (
    <div className="sticky top-0 z-10 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs font-medium text-amber-700 dark:text-amber-400">
      <Sparkles className="h-4 w-4 shrink-0" aria-hidden="true" />
      DEMO SIMULATION — no emergency service, guardian or location has
      actually been contacted.
    </div>
  );
}

function StepShell({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        <p className="font-semibold">{title}</p>
      </div>
      {children}
    </Card>
  );
}

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    intervalRef.current = setInterval(() => {
      setSeconds((s) => s + 1);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [active]);

  return seconds;
}

function formatClock(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function GuidedDemo() {
  const [stepIndex, setStepIndex] = useState(0);
  const step: Step = STEPS[stepIndex];
  const journeyActive = stepIndex >= STEPS.indexOf("journey");
  const elapsed = useElapsedSeconds(
    journeyActive && stepIndex < STEPS.indexOf("guardianView")
  );

  function goTo(target: Step) {
    setStepIndex(STEPS.indexOf(target));
  }
  function next() {
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }
  function restart() {
    setStepIndex(0);
  }

  return (
    <div className="space-y-4">
      <DemoBanner />

      {step === "intro" && (
        <StepShell icon={Navigation} title="Scenario: heading home for the weekend">
          <p className="text-sm leading-relaxed text-muted">
            Priya is a first-year student at a university in Jaipur. It&apos;s
            evening and she&apos;s heading home. This walkthrough follows what
            ASSURED looks like from &quot;leaving campus&quot; to &quot;a
            guardian sees she needs help&quot; — using ASSURED&apos;s real
            screens with simulated data, so nothing here contacts anyone.
          </p>
          <Button onClick={next}>Start Journey</Button>
        </StepShell>
      )}

      {step === "destination" && (
        <StepShell icon={MapPin} title="Choose a destination">
          <div className="space-y-2">
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
              <p className="text-xs text-muted">From</p>
              <p className="font-medium">Amity University, Jaipur</p>
            </div>
            <div className="rounded-xl border-2 border-primary bg-primary/5 px-4 py-3 text-sm">
              <p className="text-xs text-muted">To</p>
              <p className="font-medium">Home — Vaishali Nagar, Jaipur</p>
            </div>
          </div>
          <Button onClick={next}>Continue</Button>
        </StepShell>
      )}

      {step === "guardian" && (
        <StepShell icon={Users} title="Add a guardian for this trip">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">Maa</p>
              <p className="text-xs text-muted">Will see this journey&apos;s live status only</p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-safe" aria-hidden="true" />
          </div>
          <p className="text-xs text-muted">
            In a real journey, ASSURED sends the guardian a link with an
            expiring, revocable token — never a permanent location share.
          </p>
          <Button onClick={next}>Continue</Button>
        </StepShell>
      )}

      {step === "route" && (
        <StepShell icon={Navigation} title="Route selected">
          <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <p className="font-medium">Via MI Road — 22 min, well-lit</p>
              <span className="rounded-full bg-safe/10 px-2.5 py-1 text-xs font-medium text-safe">
                Safer route
              </span>
            </div>
            <p className="mt-1 text-xs text-muted">
              Based on lighting, foot traffic and community reports along this
              path.
            </p>
          </div>
          <Button onClick={next}>Begin Journey</Button>
        </StepShell>
      )}

      {step === "journey" && (
        <StepShell icon={Navigation} title="Journey in progress">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tracking against planned route</p>
              <p className="text-xs text-muted">Guardian can see live status</p>
            </div>
            <span className="font-mono text-lg tabular-nums">{formatClock(elapsed)}</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div className="h-full w-2/3 bg-primary" />
          </div>
          <p className="text-xs text-muted">
            For this walkthrough, press the button below to simulate Priya
            stepping off her planned route — this does not track your real
            location.
          </p>
          <Button variant="secondary" onClick={next}>
            Simulate route deviation
          </Button>
        </StepShell>
      )}

      {step === "deviation" && (
        <StepShell icon={ShieldAlert} title="Route deviation detected (simulated)">
          <p className="text-sm text-muted">
            Priya has moved noticeably off the planned path for over two
            minutes. ASSURED&apos;s Mewvi assistant checks in before alerting
            anyone.
          </p>
          <Button onClick={next}>See what Priya sees</Button>
        </StepShell>
      )}

      {step === "mewvi" && (
        <StepShell icon={Sparkles} title="Mewvi checks in">
          <div className="rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm">
            <p className="font-medium">
              &quot;You&apos;ve moved off your planned route. Are you okay?&quot;
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => goTo("journey")}>
              I&apos;m fine, keep going
            </Button>
            <Button variant="emergency" onClick={next}>
              I need help
            </Button>
          </div>
        </StepShell>
      )}

      {(step === "help" || step === "sharing") && (
        <StepShell icon={MapPin} title="Location sharing turned on">
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm">
            <div>
              <p className="font-medium">Live location: sharing with Maa</p>
              <p className="text-xs text-muted">Simulated — expires in 30 minutes</p>
            </div>
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-safe" />
          </div>
          <Button onClick={() => goTo("guardianView")}>
            Show guardian&apos;s view
          </Button>
        </StepShell>
      )}

      {step === "guardianView" && (
        <StepShell icon={Users} title="What Maa sees (guardian dashboard)">
          <div className="rounded-xl border border-emergency/40 bg-emergency/5 px-4 py-3 text-sm">
            <p className="font-semibold text-emergency">
              Priya tapped &quot;I need help&quot;
            </p>
            <p className="mt-1 text-xs text-muted">
              Last known location: MI Road, near C-Scheme · updated moments
              ago (simulated)
            </p>
          </div>
          <p className="text-xs text-muted">
            From here a real guardian can call Priya directly, or call
            emergency services on her behalf.
          </p>
          <Button onClick={next}>Continue to emergency options</Button>
        </StepShell>
      )}

      {step === "emergency" && (
        <StepShell icon={Siren} title="Emergency options">
          <div className="space-y-2">
            <a
              href="tel:112"
              className="flex items-center justify-between rounded-xl bg-emergency px-4 py-3 text-sm font-medium text-emergency-foreground shadow-card"
            >
              <span className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4" aria-hidden="true" />
                Call 112
              </span>
              <span className="text-xs opacity-80">Opens your phone dialer</span>
            </a>
            <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 text-xs text-muted">
              This is a real link to India&apos;s emergency number — it opens
              your phone&apos;s own dialer and still requires you to press
              call. Nothing is dialed automatically.
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={restart}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Restart demo
            </Button>
            <Button href="/emergency" variant="outline">
              Exit to real Emergency page
            </Button>
          </div>
        </StepShell>
      )}

      <p className="text-center text-xs text-muted">
        Step {stepIndex + 1} of {STEPS.length} ·{" "}
        <Link href="/" className="underline underline-offset-2">
          Exit demo
        </Link>
      </p>
    </div>
  );
}
