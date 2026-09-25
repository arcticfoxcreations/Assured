// src/lib/server/journeys.ts — server only. All journey rules live here so
// API routes stay thin.
import type { Battery, Fix, JourneyStatus, LatLng, Mode, ViewStatus } from "../travel/types";
import { byId, byKey, list, put, purge, remove, type Row } from "./store";
import { hashToken, newId, newToken, safeEqual, seal, unseal } from "./tokens";
import { send, usable, type Channel, type Target } from "./notify";

const COL = "journeys";
export const MAX_JOURNEY_MS = 24 * 3_600_000;
const GRACE_MS = 3 * 3_600_000; // link outlives the ETA so a guardian can still see "overdue"
const ARRIVED_KEEP_MS = 3_600_000;

export interface JourneyRec {
  ownerHash: string;
  destinationLabel: string;
  dest: LatLng | null;
  route: LatLng[] | null;
  mode: Mode;
  startedAt: number;
  expectedArrival: number;
  status: JourneyStatus;
  lastFix: (Fix & { battery?: Battery }) | null;
  deviation: { off: boolean; distanceM: number; at: number } | null;
  checkIn: { state: "pending" | "safe" | "help"; at: number } | null;
  extensions: number;
  // Alert channel. Present only if the traveller opted in; wiped on arrival.
  travellerName: string;
  alertTo: Target | null;
  sealedLink: string | null; // guardian link, sealed with SHARE_TOKEN_SECRET
  alerts: AlertLog;
}

export type AlertKind = "started" | "overdue" | "help" | "arrived";
export interface AlertEvent { at: number; sent: Channel[]; failed: Channel[] }
export interface AlertLog {
  events: Partial<Record<AlertKind, AlertEvent>>;
  claim: Partial<Record<AlertKind, number>>;
  tries: Partial<Record<AlertKind, number>>;
}
const emptyLog = (): AlertLog => ({ events: {}, claim: {}, tries: {} });

export interface CreateInput {
  destinationLabel: string;
  dest: LatLng | null;
  route: LatLng[] | null;
  mode: Mode;
  expectedArrival: number;
  travellerName?: string;
  alertTo?: Target | null;
  linkBase?: string; // e.g. https://assured.example — used to build the guardian link in alerts
}

const IST = { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" } as const;
const clock = (ms: number) => `${new Date(ms).toLocaleTimeString("en-IN", IST)} IST`;
const mapsUrl = (p: LatLng) => `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

function message(kind: AlertKind, d: JourneyRec): { subject: string; text: string } {
  const who = d.travellerName || "A traveller";
  const link = d.sealedLink ? unseal(d.sealedLink) : null;
  const live = link ? `\nLive status: ${link}` : "";
  const where = d.lastFix ? `\nLast known location: ${mapsUrl(d.lastFix)}` : "\nNo location has been shared yet.";
  const tail = "\n\nIf you fear for their safety, call 112. — ASSURED";
  switch (kind) {
    case "started":
      return { subject: `${who} started a journey`, text: `${who} started a journey to ${d.destinationLabel} and expects to arrive by ${clock(d.expectedArrival)}.${live}\nYou'll get another message if they don't check in.\n— ASSURED` };
    case "overdue":
      return { subject: `${who} hasn't checked in`, text: `${who} was expected at ${d.destinationLabel} by ${clock(d.expectedArrival)} and has not checked in. Please try calling them.${where}${live}${tail}` };
    case "help":
      return { subject: `${who} asked for help`, text: `${who} pressed "Get Help" in ASSURED on a journey to ${d.destinationLabel}. Please contact them now.${where}${live}${tail}` };
    case "arrived":
      return { subject: `${who} arrived safely`, text: `${who} has marked themselves safe on arriving at ${d.destinationLabel}. No action needed. — ASSURED` };
  }
}

/**
 * Sends an alert at most once per kind. The attempt is "claimed" in storage
 * BEFORE sending so two simultaneous callers (cron + a page poll) can't both
 * send; a failed send is retried after 2 minutes, up to 3 tries.
 */
async function fire(row: Row<JourneyRec>, kind: AlertKind, now: number): Promise<void> {
  const d = row.data;
  if (!d.alertTo || usable(d.alertTo).length === 0) return;
  const a = d.alerts;
  if (a.events[kind]) return;
  if ((a.tries[kind] ?? 0) >= 3) return;
  if (a.claim[kind] && now - a.claim[kind]! < 120_000) return;
  a.claim[kind] = now;
  a.tries[kind] = (a.tries[kind] ?? 0) + 1;
  await put(row);
  const m = message(kind, d);
  const r = await send(d.alertTo, m.subject, m.text);
  if (r.sent.length > 0) {
    a.events[kind] = { at: Date.now(), sent: r.sent, failed: r.failed };
    delete a.claim[kind];
    await put(row);
  }
}

/** Sends whatever alert is due for this journey right now. */
async function dispatch(row: Row<JourneyRec>, now: number): Promise<void> {
  const d = row.data;
  if (d.status === "help") await fire(row, "help", now);
  else if (d.status === "active" && now > d.expectedArrival) await fire(row, "overdue", now);
}

/** Cron entry point: checks every live journey. Returns how many were examined. */
export async function runDueAlerts(now = Date.now()): Promise<number> {
  const rows = await list<JourneyRec>(COL, 1000);
  let n = 0;
  for (const r of rows) {
    if (!r.data.alertTo) continue;
    n++;
    try { await dispatch(r, now); } catch { /* one bad row must not stop the rest */ }
  }
  return n;
}

export async function createJourney(i: CreateInput, now = Date.now()) {
  if (!(i.expectedArrival > now) || i.expectedArrival - now > MAX_JOURNEY_MS) throw new Error("bad_arrival");
  await purge(COL);
  const id = newId(), ownerKey = newToken(), guardianToken = newToken();
  const rec: JourneyRec = {
    ownerHash: hashToken(ownerKey),
    destinationLabel: i.destinationLabel,
    dest: i.dest,
    route: i.route,
    mode: i.mode,
    startedAt: now,
    expectedArrival: i.expectedArrival,
    status: "active",
    lastFix: null,
    deviation: null,
    checkIn: { state: "pending", at: now },
    extensions: 0,
    travellerName: (i.travellerName ?? "").slice(0, 60),
    alertTo: i.alertTo && usable(i.alertTo).length > 0 ? i.alertTo : null,
    sealedLink: i.linkBase ? seal(`${i.linkBase.replace(/\/$/, "")}/guardian#t=${guardianToken}`) : null,
    alerts: emptyLog(),
  };
  const expiresAt = i.expectedArrival + GRACE_MS;
  const row: Row<JourneyRec> = { col: COL, id, k: hashToken(guardianToken), exp: expiresAt, data: rec };
  await put(row);
  await fire(row, "started", now).catch(() => undefined);
  return { id, ownerKey, guardianToken, expiresAt, alerts: alertSummary(rec) };
}

export interface AlertSummary {
  on: boolean;
  via: Channel[];
  events: Partial<Record<AlertKind, AlertEvent>>;
  linkInAlerts: boolean;
}
export function alertSummary(d: JourneyRec): AlertSummary {
  return { on: Boolean(d.alertTo), via: usable(d.alertTo), events: d.alerts.events, linkInAlerts: Boolean(d.sealedLink && unseal(d.sealedLink)) };
}

/** Owner-only status: also catches up on any alert that is due. */
export async function ownerStatus(id: string, ownerKey: string, now = Date.now()): Promise<AlertSummary | null> {
  const row = await owned(id, ownerKey);
  if (!row) return null;
  await dispatch(row, now).catch(() => undefined);
  return alertSummary(row.data);
}

export interface Patch {
  fix?: { lat: number; lng: number; accuracy: number | null; at: number; battery?: Battery } | null;
  deviation?: { off: boolean; distanceM: number } | null;
  route?: LatLng[] | null;
  status?: "arrived" | "help" | "active";
  extendMs?: number;
}

async function owned(id: string, ownerKey: string) {
  const row = await byId<JourneyRec>(COL, id);
  if (!row || !safeEqual(row.data.ownerHash, hashToken(ownerKey))) return null;
  return row;
}

export async function patchJourney(id: string, ownerKey: string, p: Patch, now = Date.now()): Promise<boolean> {
  const row = await owned(id, ownerKey);
  if (!row) return false;
  const d = row.data;
  let exp = row.exp;
  if (p.fix !== undefined && d.status !== "arrived") d.lastFix = p.fix ? { ...p.fix, at: Math.min(p.fix.at, now) } : null;
  if (p.deviation !== undefined) d.deviation = p.deviation ? { ...p.deviation, at: now } : null;
  if (p.route !== undefined) d.route = p.route;
  if (p.extendMs) {
    const add = Math.min(Math.max(p.extendMs, 0), 3_600_000);
    if (d.extensions < 6 && d.expectedArrival + add - d.startedAt <= MAX_JOURNEY_MS) {
      d.expectedArrival = Math.max(d.expectedArrival, now) + add;
      d.extensions += 1;
      d.checkIn = { state: "pending", at: now };
      if (d.status === "help") d.status = "active";
      delete d.alerts.events.overdue; delete d.alerts.claim.overdue; delete d.alerts.tries.overdue;
      exp = d.expectedArrival + GRACE_MS;
    }
  }
  if (p.status === "arrived") {
    // Minimal retention: drop all location data the moment the traveller is safe.
    d.status = "arrived"; d.lastFix = null; d.route = null; d.deviation = null;
    d.checkIn = { state: "safe", at: now };
    exp = now + ARRIVED_KEEP_MS;
    // Tell the guardian, then drop their contact details (minimal retention).
    await fire({ ...row, exp, data: d }, "arrived", now).catch(() => undefined);
    d.alertTo = null; d.sealedLink = null;
  } else if (p.status === "help") {
    d.status = "help"; d.checkIn = { state: "help", at: now };
  } else if (p.status === "active" && d.status === "help") {
    d.status = "active"; d.checkIn = { state: "pending", at: now }; // "I'm okay now"
    delete d.alerts.events.help; delete d.alerts.claim.help; delete d.alerts.tries.help;
  }
  const saved = { ...row, exp, data: d };
  await put(saved);
  if (d.status === "help") await dispatch(saved, now).catch(() => undefined); // help alerts go out immediately
  return true;
}

export async function endJourney(id: string, ownerKey: string): Promise<boolean> {
  if (!(await owned(id, ownerKey))) return false;
  await remove(COL, id); // link stops working immediately
  return true;
}

export interface GuardianView {
  status: ViewStatus;
  destinationLabel: string;
  dest: LatLng | null;
  route: LatLng[] | null;
  lastFix: JourneyRec["lastFix"];
  deviation: JourneyRec["deviation"];
  checkIn: JourneyRec["checkIn"];
  startedAt: number;
  expectedArrival: number;
  expiresAt: number;
  serverNow: number;
}

export async function guardianView(token: string, now = Date.now()): Promise<GuardianView | null> {
  const row = await byKey<JourneyRec>(COL, hashToken(token));
  if (!row) return null; // same answer for "wrong" and "expired": no oracle
  await dispatch(row, now).catch(() => undefined); // an open guardian page also triggers a due alert
  const d = row.data;
  const status: ViewStatus =
    d.status === "arrived" ? "arrived" : d.status === "help" ? "help" : now > d.expectedArrival ? "overdue" : "active";
  return {
    status,
    destinationLabel: d.destinationLabel,
    dest: d.dest,
    route: d.route,
    lastFix: d.lastFix,
    deviation: d.deviation,
    checkIn: d.checkIn,
    startedAt: d.startedAt,
    expectedArrival: d.expectedArrival,
    expiresAt: row.exp,
    serverNow: now,
  };
}
