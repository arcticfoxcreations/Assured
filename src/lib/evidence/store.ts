// src/lib/evidence/store.ts — browser only. Notes live in localStorage; attached files live in
// IndexedDB. Nothing is uploaded. Call these from effects / event handlers, never during render.
import { emptyCase, type EvidenceCase, type EvidenceEntry } from "./model";

const KEY = "assured.evidence.v1";
const DB = "assured-evidence";
const STORE = "files";

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FILES = 30;

export const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export function loadCase(): EvidenceCase {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyCase();
    const p = JSON.parse(raw) as Partial<EvidenceCase>;
    return { ...emptyCase(), ...p, entries: Array.isArray(p.entries) ? p.entries : [], checked: Array.isArray(p.checked) ? p.checked : [] };
  } catch {
    return emptyCase();
  }
}

export function saveCase(c: EvidenceCase): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...c, updatedAt: Date.now() }));
    return true;
  } catch {
    return false;
  }
}

/** Used by other pages (e.g. the scam-call helper) to drop a note into the organizer. */
export function addNoteEntry(category: string, entry: Omit<EvidenceEntry, "id">): boolean {
  const c = loadCase();
  if (c.entries.length === 0 && !c.summary) c.category = category;
  c.entries.push({ id: uid(), ...entry });
  return saveCase(c);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export const putFile = (id: string, blob: Blob) => run("readwrite", (s) => s.put(blob, id)).then(() => undefined);
export const getFile = (id: string) => run<Blob | undefined>("readonly", (s) => s.get(id) as IDBRequest<Blob | undefined>);
export const deleteFile = (id: string) => run("readwrite", (s) => s.delete(id)).then(() => undefined);

export async function clearAll(): Promise<void> {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    /* ignore */
  }
}
