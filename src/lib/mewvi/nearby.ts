// src/lib/mewvi/nearby.ts
//
// Client-only. Turns "petrol pump near me" / "pharmacy near me" into a real
// lookup instead of a canned "that's outside what I can help with": get a
// device fix (the same browser permission prompt every other ASSURED
// location feature already uses) or a place the person types, then query
// ASSURED's existing OpenStreetMap resource API (src/app/api/resources).
//
// Category matching is a fixed keyword table, not a model call — there is no
// free-form prompt here for anyone to talk around, and every result comes
// from the verified /api/resources endpoint, never invented.
"use client";

import { api } from "@/lib/travel/client";
import { fmtDistance, haversineM, mapsLink, padBounds } from "@/lib/travel/geo";
import type { LatLng, Resource } from "@/lib/travel/types";

export interface NearbyCategory {
  id: string;
  /** Singular label used in sentences, e.g. "petrol pump". */
  label: string;
  kinds: Resource["kind"][];
  /** Verified national helpline(s) worth showing alongside results, if any. */
  helplineIds?: string[];
}

export const NEARBY_CATEGORIES: NearbyCategory[] = [
  { id: "police", label: "police station", kinds: ["police"], helplineIds: ["erss-112"] },
  { id: "hospital", label: "hospital", kinds: ["hospital"], helplineIds: ["erss-112"] },
  { id: "fire", label: "fire station", kinds: ["fire_station"], helplineIds: ["erss-112"] },
  { id: "pharmacy", label: "pharmacy", kinds: ["pharmacy"] },
  { id: "fuel", label: "petrol pump", kinds: ["fuel"] },
  { id: "atm", label: "ATM", kinds: ["atm"] },
];

const PATTERNS: [string, RegExp][] = [
  ["police", /\b(police( station)?|thana)\b/],
  ["hospital", /\b(hospitals?|clinic|medical (?:emergency|help)|doctor)\b/],
  ["fire", /\bfire (?:station|brigade)\b/],
  ["pharmacy", /\b(pharmac(?:y|ies)|chemists?|medical store|medicine shop|medicines?)\b/],
  ["fuel", /\b(petrol(?: pump)?s?|fuel station|gas station|diesel)\b/],
  ["atm", /\b(atms?|cash ?machine|withdraw cash)\b/],
];

/** Deterministic keyword match — no AI in the loop, so there's no prompt to talk it around. */
export function detectNearbyCategory(message: string): NearbyCategory | undefined {
  const n = message.toLowerCase();
  for (const [id, re] of PATTERNS) if (re.test(n)) return NEARBY_CATEGORIES.find((c) => c.id === id);
  return undefined;
}

export interface NearbyPlace {
  id: string;
  name: string;
  distanceLabel: string;
  mapsHref: string;
}

export type NearbyResult = { ok: true; places: NearbyPlace[] } | { ok: false; error: string };

/** Looks up real, mapped places for one category around `center`. Verified OpenStreetMap data only — nothing here is invented. */
export async function lookupNearby(center: LatLng, category: NearbyCategory, radiusM = 3000): Promise<NearbyResult> {
  const b = padBounds({ south: center.lat, north: center.lat, west: center.lng, east: center.lng }, radiusM);
  const r = await api.resources(b);
  if (!r.ok || !r.data) {
    return { ok: false, error: r.status === 0 ? "You appear to be offline, so I can't look this up right now." : "Emergency-resource data isn't available right now." };
  }
  const places = r.data.resources
    .filter((x) => category.kinds.includes(x.kind))
    .map((x) => ({ x, d: haversineM(center, x) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, 5)
    .map(({ x, d }) => ({ id: x.id, name: x.name || `Unnamed ${category.label}`, distanceLabel: fmtDistance(d), mapsHref: mapsLink(x) }));
  return { ok: true, places };
}
