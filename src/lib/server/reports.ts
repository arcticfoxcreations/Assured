// src/lib/server/reports.ts — server only.
import { CATEGORIES, type CategoryId, type PublicReport } from "../travel/types";
import { ABUSE_HIDE_THRESHOLD, checkReportText, roundCoord } from "../travel/moderation";
import { byId, list, put, purge } from "./store";
import { hashToken, newId } from "./tokens";

const COL = "reports";
const RETENTION_MS = 180 * 86_400_000;
const MAX_AGE_MS = 30 * 86_400_000;

interface ReportRec extends PublicReport { flags: number; flaggers: string[]; hidden: boolean }

export type Result<T> = { ok: true; value: T } | { ok: false; error: string; status: number };

export async function createReport(
  input: { category?: string; description?: string; lat?: number; lng?: number; occurredAt?: number },
  now = Date.now()
): Promise<Result<{ id: string }>> {
  const cat = CATEGORIES.find((c) => c.id === input.category);
  if (!cat) return { ok: false, error: "Choose a category.", status: 400 };
  const description = (input.description ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  if (description.length < 10 || description.length > 500)
    return { ok: false, error: "Description must be 10–500 characters.", status: 400 };
  const { lat, lng, occurredAt } = input;
  if (typeof lat !== "number" || typeof lng !== "number" || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return { ok: false, error: "A location is required.", status: 400 };
  if (typeof occurredAt !== "number" || occurredAt > now + 60_000 || occurredAt < now - MAX_AGE_MS)
    return { ok: false, error: "Time must be within the last 30 days.", status: 400 };
  const check = checkReportText(description);
  if (!check.ok) return { ok: false, error: check.error, status: 422 };

  await purge(COL);
  const id = newId();
  const rec: ReportRec = {
    id, category: cat.id as CategoryId, description,
    lat: roundCoord(lat), lng: roundCoord(lng), // public pins are deliberately approximate
    occurredAt, createdAt: now, flags: 0, flaggers: [], hidden: false,
  };
  await put({ col: COL, id, k: null, exp: now + RETENTION_MS, data: rec });
  return { ok: true, value: { id } };
}

export async function listReports(b: { south: number; west: number; north: number; east: number }): Promise<PublicReport[]> {
  const rows = await list<ReportRec>(COL, 1000);
  return rows
    .map((r) => r.data)
    .filter((r) => !r.hidden && r.lat >= b.south && r.lat <= b.north && r.lng >= b.west && r.lng <= b.east)
    .map(({ id, category, description, lat, lng, occurredAt, createdAt }) => ({ id, category, description, lat, lng, occurredAt, createdAt }));
}

export async function flagReport(id: string, reporterFingerprint: string): Promise<Result<{ hidden: boolean }>> {
  const row = await byId<ReportRec>(COL, id);
  if (!row) return { ok: false, error: "Report not found.", status: 404 };
  const fp = hashToken(reporterFingerprint).slice(0, 16);
  const d = row.data;
  if (!d.flaggers.includes(fp)) {
    d.flaggers.push(fp);
    d.flags = d.flaggers.length;
    if (d.flags >= ABUSE_HIDE_THRESHOLD) d.hidden = true; // hidden pending review
    await put({ ...row, data: d });
  }
  return { ok: true, value: { hidden: d.hidden } };
}
