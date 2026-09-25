"use client";

import { Loader2, LocateFixed, RefreshCw, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { GeoProblem } from "@/components/travel/GeoProblem";
import { MiniMap } from "@/components/travel/MiniMap";
import { ShareSheet } from "@/components/travel/ShareSheet";
import { useGeolocation, useNow, useSaved } from "@/lib/travel/client";
import { fmtAgo, mapsLink } from "@/lib/travel/geo";
import { LOCATION_TEMPLATE } from "@/lib/travel/share";

export function LocationShare() {
  const geo = useGeolocation();
  const { contact } = useSaved();
  const now = useNow(5000);
  const f = geo.fix;
  const poor = f?.accuracy != null && f.accuracy > 100;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6">
      {geo.state === "idle" && (
        <Card className="space-y-3">
          <p className="font-medium">Share where you are right now</p>
          <p className="text-sm text-muted">
            ASSURED reads your location only when you tap the button below, and asks your browser for permission first.
            This is a one-time snapshot — nothing keeps tracking you.
          </p>
          <Button size="lg" className="w-full" onClick={geo.once}><LocateFixed className="h-5 w-5" aria-hidden="true" />Get my current location</Button>
        </Card>
      )}

      {geo.state === "requesting" && (
        <Card className="flex items-center gap-3" role="status">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          <p className="text-sm">Waiting for your device… if your browser asks, choose <strong>Allow</strong>.</p>
        </Card>
      )}

      <GeoProblem state={geo.state} onRetry={geo.once} />

      {f && (
        <>
          <Card className="space-y-3">
            <MiniMap ariaLabel={`Map showing your current location, accurate to about ${Math.round(f.accuracy ?? 0)} metres`}
              markers={[{ pos: f, kind: "you", label: "Your location" }]} accuracyM={f.accuracy} height={220} />
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-surface-2/60 p-3"><dt className="text-xs text-muted">Location</dt><dd className="mt-1 font-medium tabular-nums">{f.lat.toFixed(5)}, {f.lng.toFixed(5)}</dd></div>
              <div className="rounded-xl bg-surface-2/60 p-3"><dt className="text-xs text-muted">Accuracy</dt><dd className="mt-1 font-medium">{f.accuracy == null ? "Unknown" : `± ${Math.round(f.accuracy)} m`}</dd></div>
              <div className="col-span-2 rounded-xl bg-surface-2/60 p-3"><dt className="text-xs text-muted">Read at</dt><dd className="mt-1 font-medium">{new Date(f.at).toLocaleString()} <span className="text-muted">({fmtAgo(now - f.at)})</span></dd></div>
            </dl>
            {poor && <p role="alert" className="text-xs text-amber-600 dark:text-amber-400">This reading is imprecise (over 100 m). Step outside or wait a moment, then refresh for a better fix.</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={geo.once}><RefreshCw className="h-4 w-4" aria-hidden="true" />Refresh</Button>
              <Button variant="outline" size="sm" onClick={geo.stop}><ShieldOff className="h-4 w-4" aria-hidden="true" />Clear from this screen</Button>
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="font-medium">Send it to someone you trust</p>
            <p className="text-sm text-muted">The link opens a map at the spot above. It&apos;s a snapshot, so it won&apos;t follow you as you move.</p>
            <ShareSheet template={LOCATION_TEMPLATE} link={mapsLink(f)} contact={contact} title="My location" />
          </Card>
        </>
      )}

      <Card className="bg-surface-2/50">
        <p className="text-sm text-muted"><strong className="text-foreground">Sharing state:</strong> {f ? "Location is visible on this screen only. Nothing has been sent — it is shared only if you send the message." : "Not sharing. Nothing has been read."} For continuous updates to a guardian, start a journey from Travel.</p>
      </Card>
    </div>
  );
}
