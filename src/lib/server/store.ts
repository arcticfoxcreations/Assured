// src/lib/server/store.ts — server only.
//
// One tiny table (see supabase/schema.sql) holds everything. Backends:
//  • "supabase": durable; used once SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set.
//  • "memory":   local dev only. Serverless hosts (Vercel) don't share memory
//    between requests, so on Vercel without Supabase the mode is "none" and
//    the app says so instead of pretending to work.
import { serverEnv } from "../env";

export interface Row<T = unknown> { col: string; id: string; k: string | null; exp: number; data: T }
export type StorageMode = "supabase" | "memory" | "none";

export function storageMode(): StorageMode {
  if (serverEnv.supabaseUrl() && serverEnv.supabaseKey()) return "supabase";
  return serverEnv.onVercel() ? "none" : "memory";
}

type Mem = Map<string, Row>;
const g = globalThis as unknown as { __assuredMem?: Mem };
const mem = (): Mem => (g.__assuredMem ??= new Map());
const key = (col: string, id: string) => `${col}:${id}`;

async function sb(path: string, init: RequestInit = {}) {
  const url = serverEnv.supabaseUrl()!.replace(/\/$/, "");
  const k = serverEnv.supabaseKey()!;
  const res = await fetch(`${url}/rest/v1/assured_rows${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: k, Authorization: `Bearer ${k}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`storage_error_${res.status}`);
  return res;
}

export async function put<T>(row: Row<T>): Promise<void> {
  const mode = storageMode();
  if (mode === "none") throw new Error("storage_unavailable");
  if (mode === "memory") { mem().set(key(row.col, row.id), row as Row); return; }
  await sb("?on_conflict=col,id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify(row),
  });
}

export async function byId<T>(col: string, id: string): Promise<Row<T> | null> {
  const mode = storageMode();
  if (mode === "none") throw new Error("storage_unavailable");
  let row: Row<T> | null = null;
  if (mode === "memory") row = (mem().get(key(col, id)) as Row<T>) ?? null;
  else row = ((await (await sb(`?col=eq.${col}&id=eq.${encodeURIComponent(id)}&limit=1`)).json()) as Row<T>[])[0] ?? null;
  return row && row.exp > Date.now() ? row : null; // expired rows are invisible
}

export async function byKey<T>(col: string, k: string): Promise<Row<T> | null> {
  const mode = storageMode();
  if (mode === "none") throw new Error("storage_unavailable");
  let row: Row<T> | null = null;
  if (mode === "memory") row = ([...mem().values()].find((r) => r.col === col && r.k === k) as Row<T>) ?? null;
  else row = ((await (await sb(`?col=eq.${col}&k=eq.${encodeURIComponent(k)}&limit=1`)).json()) as Row<T>[])[0] ?? null;
  return row && row.exp > Date.now() ? row : null;
}

export async function list<T>(col: string, limit = 500): Promise<Row<T>[]> {
  const mode = storageMode();
  if (mode === "none") throw new Error("storage_unavailable");
  const now = Date.now();
  if (mode === "memory") {
    return ([...mem().values()].filter((r) => r.col === col && r.exp > now) as Row<T>[]).slice(-limit);
  }
  return (await (await sb(`?col=eq.${col}&exp=gt.${now}&order=exp.desc&limit=${limit}`)).json()) as Row<T>[];
}

export async function remove(col: string, id: string): Promise<void> {
  const mode = storageMode();
  if (mode === "none") throw new Error("storage_unavailable");
  if (mode === "memory") { mem().delete(key(col, id)); return; }
  await sb(`?col=eq.${col}&id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
}

/** Minimal retention: expired rows are physically deleted on write paths. */
export async function purge(col: string): Promise<void> {
  const mode = storageMode();
  if (mode === "none") return;
  const now = Date.now();
  if (mode === "memory") { for (const [k, r] of mem()) if (r.col === col && r.exp <= now) mem().delete(k); return; }
  await sb(`?col=eq.${col}&exp=lt.${now}`, { method: "DELETE" }).catch(() => undefined);
}
