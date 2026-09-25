// src/lib/travel/scoring.ts
//
// ASSURED's own route indicator layer. A mapping provider gives geometry,
// distance and time — nothing about safety. Everything below is derived from
// data ASSURED actually holds, and every indicator carries the reason it was
// produced. It is a relative comparison, NOT a safety rating.
import { nearestOnLine } from "./geo";
import { CATEGORIES, type LatLng, type PublicReport, type Resource } from "./types";

export interface RouteOption {
  id: string;
  coords: LatLng[];
  distanceM: number;
  durationS: number;
}
export type Tone = "positive" | "caution" | "info";
export interface Indicator { id: string; tone: Tone; label: string; why: string }
export interface ScoredRoute extends RouteOption { indicators: Indicator[]; concern: number }

export const NEAR_REPORT_M = 150;
export const NEAR_RESOURCE_M = 300;
const DAY = 86_400_000;

const weightOf = (c: string) => CATEGORIES.find((x) => x.id === c)?.weight ?? 1;
const recency = (age: number) => (age <= 14 * DAY ? 1 : age <= 60 * DAY ? 0.6 : age <= 180 * DAY ? 0.3 : 0);
export const isNight = (hour: number) => hour >= 20 || hour < 5;

export function scoreRoute(
  route: RouteOption,
  fastest: RouteOption,
  reports: PublicReport[],
  resources: Resource[],
  now: number,
  hour: number
): ScoredRoute {
  const nearReports = reports.filter((r) => nearestOnLine(r, route.coords).distanceM <= NEAR_REPORT_M);
  const nearRes = resources.filter((r) => nearestOnLine(r, route.coords).distanceM <= NEAR_RESOURCE_M);
  const night = isNight(hour);
  const indicators: Indicator[] = [];

  let concern = 0;
  for (const r of nearReports) {
    let w = weightOf(r.category) * recency(now - r.occurredAt);
    if (night && r.category === "poor_lighting") w *= 1.5;
    concern += w;
  }

  if (nearReports.length > 0) {
    indicators.push({
      id: "reports",
      tone: "caution",
      label: nearReports.length >= 3 ? "Several community reports nearby" : "Community report nearby",
      why: `${nearReports.length} community report${nearReports.length > 1 ? "s" : ""} within ${NEAR_REPORT_M} m of this route. Reports are unverified.`,
    });
  } else {
    indicators.push({
      id: "no-reports",
      tone: "info",
      label: "No community reports nearby",
      why: "That only means nobody has reported here on ASSURED — it is not evidence the area is safe.",
    });
  }

  if (nearRes.length > 0) {
    concern -= Math.min(1.5, nearRes.length * 0.5);
    indicators.push({
      id: "resource",
      tone: "positive",
      label: "Near emergency resource",
      why: `${nearRes.length} police station, hospital or fire station within ${NEAR_RESOURCE_M} m (OpenStreetMap data, may be incomplete).`,
    });
  } else {
    if (night) concern += 0.5;
    indicators.push({
      id: "no-resource",
      tone: "info",
      label: "No mapped emergency resource close by",
      why: `None found within ${NEAR_RESOURCE_M} m. Map data can be incomplete.`,
    });
  }

  const extra = fastest.distanceM > 0 ? (route.distanceM - fastest.distanceM) / fastest.distanceM : 0;
  if (extra > 0.05) {
    indicators.push({
      id: "longer",
      tone: "info",
      label: "Longer route",
      why: `About ${Math.round(extra * 100)}% longer than the fastest option.`,
    });
  }

  if (night) {
    indicators.push({
      id: "night",
      tone: "caution",
      label: "Night-time travel",
      why: "It is night. Prefer busy, well-lit roads. ASSURED has no reliable lighting or crowd data for this route.",
    });
  }
  indicators.push({
    id: "data-gap",
    tone: "info",
    label: "Lighting and crowd data unavailable",
    why: "No reliable source for street lighting or footfall is connected, so neither is factored in.",
  });

  return { ...route, indicators, concern };
}

export type Profile = "fastest" | "safety" | "balanced";
export const PROFILE_LABEL: Record<Profile, string> = {
  fastest: "Fastest",
  safety: "Safety-Focused",
  balanced: "Balanced",
};

/** Picks one option per profile. Options can repeat when few routes exist. */
export function pickProfiles(scored: ScoredRoute[]): Record<Profile, ScoredRoute> {
  const byTime = [...scored].sort((a, b) => a.durationS - b.durationS);
  const fastest = byTime[0];
  const safety = [...scored].sort((a, b) => a.concern - b.concern || a.durationS - b.durationS)[0];
  const maxT = Math.max(...scored.map((s) => s.durationS)) || 1;
  const maxC = Math.max(...scored.map((s) => Math.max(0, s.concern)), 1);
  const balanced = [...scored].sort(
    (a, b) =>
      0.5 * (a.durationS / maxT) + 0.5 * (Math.max(0, a.concern) / maxC) -
      (0.5 * (b.durationS / maxT) + 0.5 * (Math.max(0, b.concern) / maxC))
  )[0];
  return { fastest, safety, balanced };
}
