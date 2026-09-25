"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import type { LatLng } from "@/lib/travel/types";

export interface MapMarker { pos: LatLng; kind: "you" | "dest" | "start" | "report" | "resource"; label: string }
export interface MapLine { coords: LatLng[]; tone: "primary" | "muted"; dashed?: boolean }

const TILE = 256;
const clampLat = (n: number) => Math.max(-85, Math.min(85, n));
function px(p: LatLng, z: number) {
  const s = TILE * 2 ** z;
  const sin = Math.sin((clampLat(p.lat) * Math.PI) / 180);
  return { x: ((p.lng + 180) / 360) * s, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s };
}

/**
 * Dependency-free map: OpenStreetMap raster tiles + an SVG overlay.
 * Shapes (not just colours) tell markers apart: circle = you, square =
 * destination, triangle = community report, plus = emergency resource.
 */
export function MiniMap({
  lines = [], markers = [], accuracyM, height = 260, ariaLabel, center,
}: {
  lines?: MapLine[]; markers?: MapMarker[]; accuracyM?: number | null; height?: number; ariaLabel: string; center?: LatLng;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [dz, setDz] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pts = [...lines.flatMap((l) => l.coords), ...markers.map((m) => m.pos), ...(center ? [center] : [])];
  const h = height;
  let body: React.ReactNode = null;

  if (w > 0 && pts.length > 0) {
    let z = 2;
    for (let t = 16; t >= 2; t--) {
      const xs = pts.map((p) => px(p, t).x), ys = pts.map((p) => px(p, t).y);
      if (Math.max(...xs) - Math.min(...xs) <= w - 90 && Math.max(...ys) - Math.min(...ys) <= h - 90) { z = t; break; }
    }
    z = Math.max(2, Math.min(18, z + dz));
    const xs = pts.map((p) => px(p, z).x), ys = pts.map((p) => px(p, z).y);
    const ox = (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2;
    const oy = (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2;
    const at = (p: LatLng) => { const q = px(p, z); return { x: q.x - ox, y: q.y - oy }; };
    const n = 2 ** z;
    const tiles: { k: string; src: string; left: number; top: number }[] = [];
    for (let ty = Math.floor(oy / TILE); ty <= Math.floor((oy + h) / TILE); ty++) {
      if (ty < 0 || ty >= n) continue;
      for (let tx = Math.floor(ox / TILE); tx <= Math.floor((ox + w) / TILE); tx++) {
        tiles.push({ k: `${z}/${tx}/${ty}`, src: `https://tile.openstreetmap.org/${z}/${((tx % n) + n) % n}/${ty}.png`, left: tx * TILE - ox, top: ty * TILE - oy });
      }
    }
    const you = markers.find((m) => m.kind === "you");
    const mpp = you ? (156543.03392 * Math.cos((you.pos.lat * Math.PI) / 180)) / n : 1;

    body = (
      <>
        <div className="absolute inset-0 dark:[filter:invert(1)_hue-rotate(180deg)_brightness(.9)_contrast(.9)]" aria-hidden="true">
          {tiles.map((t) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={t.k} src={t.src} alt="" width={TILE} height={TILE} draggable={false}
              referrerPolicy="strict-origin-when-cross-origin"
              className="absolute max-w-none select-none" style={{ left: t.left, top: t.top }} />
          ))}
        </div>
        <svg className="absolute inset-0" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
          {lines.map((l, i) => {
            const d = l.coords.map((p) => { const q = at(p); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; }).join(" ");
            return (
              <g key={i}>
                <polyline points={d} fill="none" stroke="white" strokeOpacity={0.85} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
                <polyline points={d} fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={l.dashed ? "2 8" : undefined}
                  className={l.tone === "primary" ? "stroke-primary" : "stroke-muted"} />
              </g>
            );
          })}
          {you && accuracyM ? <circle cx={at(you.pos).x} cy={at(you.pos).y} r={Math.max(8, accuracyM / mpp)} className="fill-primary/15 stroke-primary/50" /> : null}
          {markers.map((m, i) => {
            const { x, y } = at(m.pos);
            return (
              <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
                <title>{m.label}</title>
                {m.kind === "you" && <circle r={8} className="fill-primary" stroke="white" strokeWidth={3} />}
                {m.kind === "start" && <circle r={5} className="fill-muted" stroke="white" strokeWidth={2} />}
                {m.kind === "dest" && <rect x={-8} y={-8} width={16} height={16} rx={3} className="fill-foreground" stroke="white" strokeWidth={2.5} />}
                {m.kind === "report" && <path d="M0,-9 L9,7 L-9,7 Z" className="fill-amber-500" stroke="white" strokeWidth={2} strokeLinejoin="round" />}
                {m.kind === "resource" && <path d="M-3,-9 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 Z" className="fill-safe" stroke="white" strokeWidth={1.5} strokeLinejoin="round" />}
              </g>
            );
          })}
        </svg>
      </>
    );
  }

  return (
    <div ref={ref} role="img" aria-label={ariaLabel} style={{ height }}
      className="relative w-full overflow-hidden rounded-2xl border border-border bg-surface-2">
      {body}
      {pts.length === 0 && <p className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-muted">Map appears once there is a location to show.</p>}
      {pts.length > 0 && (
        <div className="absolute right-2 top-2 flex flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-card">
          <button type="button" onClick={() => setDz((d) => Math.min(3, d + 1))} aria-label="Zoom in" className="grid h-9 w-9 place-items-center hover:bg-surface-2"><Plus className="h-4 w-4" /></button>
          <button type="button" onClick={() => setDz((d) => Math.max(-3, d - 1))} aria-label="Zoom out" className="grid h-9 w-9 place-items-center border-t border-border hover:bg-surface-2"><Minus className="h-4 w-4" /></button>
        </div>
      )}
      <span className="pointer-events-none absolute bottom-1 right-1 rounded bg-surface/80 px-1.5 py-0.5 text-[10px] text-muted">© OpenStreetMap contributors</span>
    </div>
  );
}
