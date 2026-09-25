// src/lib/travel/geo.ts — pure geometry helpers (no React, no browser APIs).
import type { LatLng } from "./types";

const R = 6371008.8; // mean Earth radius, metres
const rad = (d: number) => (d * Math.PI) / 180;

export function haversineM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Distance (m) from p to segment ab, plus the 0..1 position along it. */
function toSegment(p: LatLng, a: LatLng, b: LatLng): { d: number; t: number } {
  const k = Math.cos(rad(p.lat));
  const ax = (a.lng - p.lng) * k, ay = a.lat - p.lat;
  const bx = (b.lng - p.lng) * k, by = b.lat - p.lat;
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2));
  const cx = ax + t * dx, cy = ay + t * dy;
  return { d: Math.hypot(cx, cy) * rad(1) * R, t };
}

/** Shortest distance (m) from p to a polyline, and where along it. */
export function nearestOnLine(p: LatLng, line: LatLng[]) {
  if (line.length === 0) return { distanceM: Infinity, index: 0, t: 0 };
  if (line.length === 1) return { distanceM: haversineM(p, line[0]), index: 0, t: 0 };
  let best = { distanceM: Infinity, index: 0, t: 0 };
  for (let i = 0; i < line.length - 1; i++) {
    const { d, t } = toSegment(p, line[i], line[i + 1]);
    if (d < best.distanceM) best = { distanceM: d, index: i, t };
  }
  return best;
}

export function lineLengthM(line: LatLng[]): number {
  let s = 0;
  for (let i = 0; i < line.length - 1; i++) s += haversineM(line[i], line[i + 1]);
  return s;
}

/** Metres still to travel along the line from p's nearest point to the end. */
export function remainingAlongM(p: LatLng, line: LatLng[]): number {
  if (line.length < 2) return line.length ? haversineM(p, line[0]) : 0;
  const n = nearestOnLine(p, line);
  let rest = haversineM(line[n.index], line[n.index + 1]) * (1 - n.t);
  for (let i = n.index + 1; i < line.length - 1; i++) rest += haversineM(line[i], line[i + 1]);
  return rest;
}

export interface Deviation {
  distanceM: number;
  off: boolean;
  /** true when the GPS fix is too imprecise to judge. */
  uncertain: boolean;
}

/**
 * Is the traveller off the planned route? A fix only counts as "off" when
 * distance MINUS its reported accuracy still exceeds the threshold, so noisy
 * GPS doesn't cause false alarms.
 */
export function checkDeviation(
  p: LatLng & { accuracy: number | null },
  line: LatLng[],
  thresholdM: number
): Deviation {
  const distanceM = nearestOnLine(p, line).distanceM;
  const acc = p.accuracy ?? 0;
  const uncertain = acc > Math.max(150, thresholdM);
  const off = !uncertain && distanceM - acc > thresholdM;
  return { distanceM, off, uncertain };
}

/** Ramer–Douglas–Peucker simplification (iterative), tolerance in metres. */
export function simplify(line: LatLng[], epsM: number): LatLng[] {
  if (line.length <= 2) return line.slice();
  const keep = new Uint8Array(line.length);
  keep[0] = keep[line.length - 1] = 1;
  const stack: [number, number][] = [[0, line.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0, idx = -1;
    for (let i = s + 1; i < e; i++) {
      const { d } = toSegment(line[i], line[s], line[e]);
      if (d > maxD) { maxD = d; idx = i; }
    }
    if (idx !== -1 && maxD > epsM) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return line.filter((_, i) => keep[i]);
}

export function boundsOf(points: LatLng[]) {
  const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
  return { south: Math.min(...lats), north: Math.max(...lats), west: Math.min(...lngs), east: Math.max(...lngs) };
}

export function padBounds(b: ReturnType<typeof boundsOf>, m: number) {
  const dLat = m / 111320;
  const dLng = m / (111320 * Math.cos(rad((b.south + b.north) / 2)) || 1);
  return { south: b.south - dLat, north: b.north + dLat, west: b.west - dLng, east: b.east + dLng };
}

/** Accepts "26.9124, 75.7873" (also with a space or semicolon). */
export function parseLatLng(input: string): LatLng | null {
  const m = input.trim().match(/^(-?\d{1,3}(?:\.\d+)?)\s*[,;\s]\s*(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
  return { lat, lng };
}

export const mapsLink = (p: LatLng) =>
  `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

export function fmtDistance(m: number): string {
  if (!isFinite(m)) return "—";
  return m < 1000 ? `${Math.round(m / 10) * 10 || Math.round(m)} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function fmtDuration(s: number): string {
  if (!isFinite(s)) return "—";
  const m = Math.round(s / 60);
  if (m < 1) return "< 1 min";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h ${m % 60} min`;
}

export function fmtClock(ms: number): string {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s)}` : `${p(m)}:${p(s)}`;
}

export function fmtAgo(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  return `${Math.round(m / 60)} h ago`;
}
