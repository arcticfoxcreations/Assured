"use client";
// src/lib/travel/client.ts — browser-only helpers: on-device storage,
// geolocation + battery hooks, and typed calls to ASSURED's own API.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Battery, Contact, Fix, JourneyStatus, LatLng, Mode, PublicReport, Resource, RouteMeta } from "./types";

/* ───────────── on-device storage (never sent anywhere) ───────────── */

const KEY = "assured.travel.v1";

export interface LocalJourney {
  // Present only when the backend created a guardian link.
  id?: string; ownerKey?: string; guardianToken?: string; expiresAt?: number;
  destinationLabel: string;
  dest: LatLng | null;
  mode: Mode;
  startedAt: number;
  expectedArrival: number;
  route: LatLng[] | null;
  routeMeta: RouteMeta | null;
  status: Exclude<JourneyStatus, "ended">;
  extensions: number;
  sharing: boolean; // is live location currently being sent to the guardian?
  alertsOn?: boolean; // automatic alerts to the contact were enabled for this journey
  lastSentAt?: number;
}
export interface Draft { destinationLabel: string; dest: LatLng | null; mode: Mode; route: LatLng[]; routeMeta: RouteMeta }
interface Saved { journey: LocalJourney | null; draft: Draft | null; contact: Contact | null; deviationM: number; travellerName: string }
const EMPTY: Saved = { journey: null, draft: null, contact: null, deviationM: 200, travellerName: "" };

function read(): Saved {
  try { return { ...EMPTY, ...(JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Saved>) }; } catch { return EMPTY; }
}
function write(p: Partial<Saved>) {
  try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...p })); } catch { /* private mode / quota: degrade silently */ }
}

/** Reactive view of the on-device journey, contact and preferences. */
export function useSaved() {
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [ready, setReady] = useState(false);
  useEffect(() => { setSaved(read()); setReady(true); }, []);
  const update = useCallback((p: Partial<Saved>) => {
    write(p);
    setSaved((s) => ({ ...s, ...p }));
  }, []);
  const patchJourney = useCallback((p: Partial<LocalJourney>) => {
    const j = read().journey;
    if (!j) return;
    const next = { ...j, ...p };
    write({ journey: next });
    setSaved((s) => ({ ...s, journey: next }));
  }, []);
  return { ...saved, ready, update, patchJourney };
}

/* ───────────── API client ───────────── */

export interface ServiceStatus {
  storage: "supabase" | "memory" | "none";
  routing: boolean;
  notifications: { sms: boolean; push: boolean; email: boolean };
  scheduler: boolean;
}

export type AlertKind = "started" | "overdue" | "help" | "arrived";
export interface AlertSummary {
  on: boolean;
  via: ("email" | "sms")[];
  events: Partial<Record<AlertKind, { at: number; sent: ("email" | "sms")[]; failed: ("email" | "sms")[] }>>;
  linkInAlerts: boolean;
}
let statusP: Promise<ServiceStatus | null> | null = null;
export function loadStatus(): Promise<ServiceStatus | null> {
  return (statusP ??= fetch("/api/status", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)).catch(() => null));
}
export function useServiceStatus() {
  const [s, setS] = useState<ServiceStatus | null | undefined>(undefined);
  useEffect(() => { loadStatus().then(setS); }, []);
  return s; // undefined = still checking, null = API unreachable
}

export interface ApiResult<T> { ok: boolean; status: number; data: T | null; error?: string }
async function call<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const r = await fetch(url, { cache: "no-store", ...init });
    const body = (await r.json().catch(() => null)) as (T & { error?: string }) | null;
    return { ok: r.ok, status: r.status, data: r.ok ? body : null, error: r.ok ? undefined : body?.error ?? `HTTP ${r.status}` };
  } catch {
    return { ok: false, status: 0, data: null, error: "offline" };
  }
}
const JSON_H = { "Content-Type": "application/json" };

export type Bounds = { south: number; west: number; north: number; east: number };
const qs = (b: Bounds) => new URLSearchParams(Object.entries(b).map(([k, v]) => [k, String(v)])).toString();

export interface GuardianData {
  status: "active" | "overdue" | "arrived" | "help";
  destinationLabel: string; dest: LatLng | null; route: LatLng[] | null;
  lastFix: (Fix & { battery?: Battery }) | null;
  deviation: { off: boolean; distanceM: number; at: number } | null;
  checkIn: { state: "pending" | "safe" | "help"; at: number } | null;
  startedAt: number; expectedArrival: number; expiresAt: number; serverNow: number;
}

export const api = {
  createJourney: (b: unknown) =>
    call<{ id: string; ownerKey: string; guardianToken: string; expiresAt: number; alerts: AlertSummary }>("/api/journeys", { method: "POST", headers: JSON_H, body: JSON.stringify(b) }),
  patchJourney: (id: string, ownerKey: string, b: unknown) =>
    call<{ ok: true }>(`/api/journeys/${id}`, { method: "PATCH", headers: { ...JSON_H, "x-owner-key": ownerKey }, body: JSON.stringify(b) }),
  journeyAlerts: (id: string, ownerKey: string) =>
    call<AlertSummary>(`/api/journeys/${id}`, { headers: { "x-owner-key": ownerKey } }),
  endJourney: (id: string, ownerKey: string) =>
    call<{ ok: true }>(`/api/journeys/${id}`, { method: "DELETE", headers: { "x-owner-key": ownerKey } }),
  guardian: (token: string) => call<GuardianData>("/api/guardian", { headers: { "x-guardian-token": token } }),
  geocode: (q: string) => call<{ results: { label: string; lat: number; lng: number }[]; error?: string }>(`/api/geocode?q=${encodeURIComponent(q)}`),
  route: (from: LatLng, to: LatLng, mode: Mode) =>
    call<{ routes: { id: string; coords: LatLng[]; distanceM: number; durationS: number }[] }>("/api/route", { method: "POST", headers: JSON_H, body: JSON.stringify({ from, to, mode }) }),
  reports: (b: Bounds) => call<{ reports: PublicReport[] }>(`/api/reports?${qs(b)}`),
  resources: (b: Bounds) => call<{ resources: Resource[] }>(`/api/resources?${qs(b)}`),
  submitReport: (b: unknown) => call<{ ok: true }>("/api/reports", { method: "POST", headers: JSON_H, body: JSON.stringify(b) }),
  flagReport: (id: string) => call<{ ok: true; hidden: boolean }>(`/api/reports/${id}/flag`, { method: "POST" }),
};

export const guardianUrl = (token: string) => `${window.location.origin}/guardian#t=${token}`;

/* ───────────── geolocation ───────────── */

export type GeoState = "idle" | "requesting" | "active" | "denied" | "unavailable" | "timeout" | "unsupported" | "insecure";

/**
 * True on iPhone/iPad (Safari and any browser there, since they all use WebKit).
 * iPadOS 13+ reports its UA as "Macintosh", so a real Mac is told apart by the
 * lack of touch points. Used only to tailor on-screen guidance text — iOS and
 * desktop browsers expose permission/settings in different places.
 */
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
}

/**
 * Location is only ever read after the caller invokes once() or watch() from
 * a user action. stop() clears the watch AND forgets the last fix.
 *
 * iOS note: a website (including one added to the Home Screen) can only ever
 * trigger the standard browser permission prompt via getCurrentPosition /
 * watchPosition — there is no web API that opens the iOS Settings app or
 * force-enables Location Services from JavaScript. What iOS *does* do a lot
 * is fail a high-accuracy GPS fix indoors (timeout / "position unavailable")
 * even though location is perfectly available at lower accuracy, so both
 * calls below now retry once at low accuracy before giving up — this is what
 * makes "it doesn't detect my location on iPhone" work in practice.
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>("idle");
  const [fix, setFix] = useState<Fix | null>(null);
  const id = useRef<number | null>(null);

  const ok = useCallback((p: GeolocationPosition) => {
    setFix({ lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null, at: p.timestamp });
    setState("active");
  }, []);
  const err = useCallback((e: GeolocationPositionError) => setState(e.code === 1 ? "denied" : e.code === 2 ? "unavailable" : "timeout"), []);

  const blocked = useCallback((): boolean => {
    // Some iOS browsers/WebViews (Lockdown Mode, certain MDM-managed or
    // in-app browsers) expose `navigator.geolocation` as a real object —
    // so `"geolocation" in navigator` is true — but do NOT implement
    // `getCurrentPosition`/`watchPosition` as callable functions on it.
    // Calling one there throws a synchronous TypeError ("... is not a
    // function") that happens outside any try/catch here, and since this
    // fires from a passive effect it takes the whole React tree down with
    // it. Checking the method is actually a function (not just that the
    // `geolocation` property exists) is what iOS needs; other platforms
    // never hit this branch since their `geolocation` object is either
    // fully real or entirely absent.
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      typeof navigator.geolocation?.getCurrentPosition !== "function"
    ) {
      setState("unsupported");
      return true;
    }
    if (typeof window === "undefined" || !window.isSecureContext) { setState("insecure"); return true; }
    return false;
  }, []);

  const stop = useCallback(() => {
    if (id.current !== null) {
      try { navigator.geolocation?.clearWatch?.(id.current); } catch { /* nothing to clean up */ }
    }
    id.current = null;
    setFix(null);
    setState("idle");
  }, []);

  const once = useCallback(() => {
    if (blocked()) return;
    setState("requesting");
    try {
      navigator.geolocation.getCurrentPosition(
        ok,
        (e) => {
          // Permission actually denied (code 1) -> no point retrying, report it as-is.
          // Anything else (timeout / position unavailable, common on iOS indoors)
          // -> one retry with a coarser, longer-lived request before giving up.
          if (e.code === 1) { err(e); return; }
          try {
            navigator.geolocation.getCurrentPosition(ok, err, { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
          } catch { setState("unavailable"); }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch {
      // Defends against browsers that pass the `blocked()` check but still
      // throw synchronously when the method is actually invoked.
      setState("unavailable");
    }
  }, [blocked, ok, err]);

  const watch = useCallback(() => {
    if (blocked()) return;
    if (id.current !== null) {
      try { navigator.geolocation.clearWatch(id.current); } catch { /* nothing to clean up */ }
    }
    setState("requesting");
    let fellBack = false;
    try {
      id.current = navigator.geolocation.watchPosition(
        ok,
        (e) => {
          if (e.code === 1 || fellBack) { err(e); return; }
          fellBack = true;
          try {
            if (id.current !== null) navigator.geolocation.clearWatch(id.current);
            id.current = navigator.geolocation.watchPosition(ok, err, { enableHighAccuracy: false, timeout: 25000, maximumAge: 10000 });
          } catch { setState("unavailable"); }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
      );
    } catch {
      setState("unavailable");
    }
  }, [blocked, ok, err]);

  useEffect(() => () => {
    if (id.current !== null) {
      try { navigator.geolocation?.clearWatch?.(id.current); } catch { /* nothing to clean up */ }
    }
  }, []);
  return { state, fix, once, watch, stop };
}

/**
 * One-off, Promise-based location read for code that isn't a component (e.g.
 * Mewvi's "nearby help" lookup, triggered by a chat message rather than a
 * dedicated button). Same behaviour and iOS-friendly low-accuracy fallback as
 * useGeolocation().once() above, just awaitable. Only ever call this directly
 * from a user action (a submit handler, a click) — calling it later from a
 * timer or after other awaits can lose the browser's permission-prompt
 * eligibility.
 */
export function getCurrentFix(): Promise<{ ok: true; fix: Fix } | { ok: false; state: GeoState }> {
  return new Promise((resolve) => {
    if (
      typeof navigator === "undefined" ||
      !("geolocation" in navigator) ||
      typeof navigator.geolocation?.getCurrentPosition !== "function"
    ) {
      resolve({ ok: false, state: "unsupported" });
      return;
    }
    if (typeof window === "undefined" || !window.isSecureContext) { resolve({ ok: false, state: "insecure" }); return; }
    const onOk = (p: GeolocationPosition) =>
      resolve({ ok: true, fix: { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: Number.isFinite(p.coords.accuracy) ? p.coords.accuracy : null, at: p.timestamp } });
    const onErr = (e: GeolocationPositionError) => resolve({ ok: false, state: e.code === 1 ? "denied" : e.code === 2 ? "unavailable" : "timeout" });
    try {
      navigator.geolocation.getCurrentPosition(
        onOk,
        (e) => {
          if (e.code === 1) { onErr(e); return; }
          try {
            navigator.geolocation.getCurrentPosition(onOk, onErr, { enableHighAccuracy: false, timeout: 20000, maximumAge: 60000 });
          } catch { resolve({ ok: false, state: "unavailable" }); }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      );
    } catch {
      resolve({ ok: false, state: "unavailable" });
    }
  });
}

/* ───────────── battery (only if the browser genuinely exposes it) ───────────── */

interface BatteryManagerLike extends EventTarget { level: number; charging: boolean }

/** undefined = checking · null = unavailable on this device · else real values. */
export function useBattery(): Battery | null | undefined {
  const [b, setB] = useState<Battery | null | undefined>(undefined);
  useEffect(() => {
    const nav = navigator as unknown as { getBattery?: () => Promise<BatteryManagerLike> };
    if (typeof nav.getBattery !== "function") { setB(null); return; }
    let m: BatteryManagerLike | null = null;
    const sync = () => m && setB({ level: m.level, charging: m.charging });
    nav.getBattery().then((mgr) => {
      m = mgr; sync();
      mgr.addEventListener("levelchange", sync); mgr.addEventListener("chargingchange", sync);
    }).catch(() => setB(null));
    return () => { m?.removeEventListener("levelchange", sync); m?.removeEventListener("chargingchange", sync); };
  }, []);
  return b;
}

/** Re-renders every `ms`; used for countdowns computed from absolute timestamps. */
export function useNow(ms = 1000): number {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setN(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}
