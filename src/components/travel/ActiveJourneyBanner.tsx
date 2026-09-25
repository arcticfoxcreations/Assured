"use client";

import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";
import { useNow, useSaved } from "@/lib/travel/client";

/** Shown on /travel while a journey exists on this device, so sharing state is always visible. */
export function ActiveJourneyBanner() {
  const { journey, ready } = useSaved();
  const now = useNow(15000);
  if (!ready || !journey) return null;
  const live = journey.sharing && journey.lastSentAt !== undefined && now - journey.lastSentAt < 120_000;
  const arrival = new Date(journey.expectedArrival).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <Link href="/travel/check-in" className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-primary/10 p-4">
      <span className="text-sm">
        <span className="flex items-center gap-2 font-medium"><Radio className="h-4 w-4 text-primary" aria-hidden="true" />Journey to {journey.destinationLabel}</span>
        <span className="mt-0.5 block text-xs text-muted">
          {journey.status === "arrived" ? "Marked safe" : journey.status === "help" ? "Help requested" : `Expected by ${arrival}`} · {live ? "Live location is being shared" : "Live location not being shared"}
        </span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" />
    </Link>
  );
}
