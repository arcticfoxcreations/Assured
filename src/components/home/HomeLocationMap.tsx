"use client";

import { useEffect, useRef } from "react";
import { LocateFixed, RefreshCw, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { MiniMap } from "@/components/travel/MiniMap";
import { GeoProblem } from "@/components/travel/GeoProblem";
import { useGeolocation } from "@/lib/travel/client";

/**
 * Homepage "your area" panel. Location is read on-device only and shown
 * right here — it is never sent anywhere. The first time this panel
 * scrolls into view, ASSURED asks the browser for permission once (this
 * triggers the browser's own native prompt; ASSURED cannot skip or force
 * it, only trigger it — the person still has to press Allow). A manual
 * "Show my location" button covers anyone who dismissed that first prompt.
 */
export function HomeLocationMap() {
  const geo = useGeolocation();
  const sectionRef = useRef<HTMLDivElement>(null);
  const asked = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !asked.current) {
          asked.current = true;
          geo.once();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const f = geo.fix;

  return (
    <section ref={sectionRef} className="mx-auto w-full max-w-2xl px-4 pb-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your area</h2>

      <Card className="mt-3 space-y-3">
        {geo.state === "idle" && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <LocateFixed className="h-6 w-6 text-primary" aria-hidden="true" />
            <p className="text-sm text-muted">
              See your current spot on the map. ASSURED reads it only on this device, only when you allow it.
            </p>
            <Button onClick={() => { asked.current = true; geo.once(); }}>
              <LocateFixed className="h-4 w-4" aria-hidden="true" />
              Show my location
            </Button>
          </div>
        )}

        {geo.state === "requesting" && (
          <div className="flex items-center gap-3 py-4" role="status">
            <LocateFixed className="h-5 w-5 animate-pulse text-primary" aria-hidden="true" />
            <p className="text-sm">
              Waiting for your device… if your browser asks for your location, choose <strong>Allow</strong> to see it here.
            </p>
          </div>
        )}

        <GeoProblem state={geo.state} onRetry={geo.once} />

        {f && (
          <>
            <MiniMap
              ariaLabel={`Map centred on your current location, accurate to about ${Math.round(f.accuracy ?? 0)} metres`}
              markers={[{ pos: f, kind: "you", label: "Your location" }]}
              accuracyM={f.accuracy}
              height={220}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <ShieldCheck className="h-3.5 w-3.5 text-safe" aria-hidden="true" />
                Only visible to you — this never leaves your device.
              </p>
              <Button variant="outline" size="sm" onClick={geo.once}>
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh
              </Button>
            </div>
          </>
        )}
      </Card>
    </section>
  );
}
