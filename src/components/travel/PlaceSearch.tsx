"use client";

import { useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import { api } from "@/lib/travel/client";
import { parseLatLng } from "@/lib/travel/geo";
import type { LatLng } from "@/lib/travel/types";

export interface Place { label: string; pos: LatLng | null }

/**
 * Type a place name and search, or paste "lat, lng". Typing without picking
 * a result is allowed (pos stays null) so callers can decide what that means.
 */
export function PlaceSearch({ id, label, value, onChange, placeholder = "Search a place or paste 26.9124, 75.7873" }: {
  id: string; label: string; value: Place; onChange: (p: Place) => void; placeholder?: string;
}) {
  const [hits, setHits] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function search() {
    const raw = value.label.trim();
    setMsg(""); setHits([]);
    const c = parseLatLng(raw);
    if (c) { onChange({ label: `${c.lat.toFixed(5)}, ${c.lng.toFixed(5)}`, pos: c }); return; }
    if (raw.length < 3) { setMsg("Type at least 3 characters."); return; }
    setBusy(true);
    const r = await api.geocode(raw);
    setBusy(false);
    if (!r.ok && r.error === "offline") { setMsg("You appear to be offline."); return; }
    const list = r.data?.results ?? [];
    setHits(list);
    if (list.length === 0) setMsg("No places found. Try more detail, or paste coordinates.");
  }

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <div className="mt-1 flex gap-2">
        <div className="relative flex-1">
          <input id={id} value={value.label} placeholder={placeholder} maxLength={200}
            onChange={(e) => { onChange({ label: e.target.value, pos: null }); setHits([]); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
            className="h-11 w-full rounded-xl border border-border bg-surface pl-3 pr-9 text-sm" />
          {value.label && (
            <button type="button" aria-label={`Clear ${label}`} onClick={() => { onChange({ label: "", pos: null }); setHits([]); setMsg(""); }}
              className="absolute right-1 top-1 grid h-9 w-9 place-items-center text-muted"><X className="h-4 w-4" /></button>
          )}
        </div>
        <button type="button" onClick={search} disabled={busy} aria-label={`Search ${label}`}
          className="grid h-11 w-11 place-items-center rounded-xl border border-border bg-surface hover:bg-surface-2 disabled:opacity-50">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>
      {value.pos && <p className="mt-1 flex items-center gap-1 text-xs text-safe"><MapPin className="h-3 w-3" aria-hidden="true" />Location set on map</p>}
      {!value.pos && value.label.trim().length > 0 && hits.length === 0 && !msg && <p className="mt-1 text-xs text-muted">Not pinned to a map location yet — press search to pick one.</p>}
      {msg && <p role="status" className="mt-1 text-xs text-muted">{msg}</p>}
      {hits.length > 0 && (
        <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {hits.map((h, i) => (
            <li key={i}>
              <button type="button" className="w-full px-3 py-2.5 text-left text-sm hover:bg-surface-2"
                onClick={() => { onChange({ label: h.label, pos: { lat: h.lat, lng: h.lng } }); setHits([]); }}>{h.label}</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
