"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, ArrowRight, ExternalLink, Info, Loader2, MapPin, Navigation, Phone, Send, X } from "lucide-react";
import { api, getCurrentFix, useSaved } from "@/lib/travel/client";
import { askMewvi } from "@/lib/mewvi/client";
import { contextSuggestions, pageContext } from "@/lib/mewvi/context";
import { DISCLAIMER } from "@/lib/mewvi/flows";
import { classify } from "@/lib/mewvi/intents";
import { callConfirmation } from "@/lib/mewvi/tools";
import { refsFor, routeLink } from "@/lib/mewvi/catalog";
import { detectNearbyCategory, lookupNearby, type NearbyCategory, type NearbyResult } from "@/lib/mewvi/nearby";
import type { Block, Confirmation, HelplineRef, LinkRef, MewviReply } from "@/lib/mewvi/types";
import { MewviAvatar } from "@/components/mewvi/MewviAvatar";
import { cn } from "@/lib/utils";

export interface MewviTurn {
  id: string;
  role: "user" | "mewvi";
  text?: string;
  reply?: MewviReply;
  /** Confirmation ids the person answered "Not now" to. */
  dismissed?: string[];
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const isInternal = (h: string) => h.startsWith("/") && !h.startsWith("//");
const isHttps = (h: string) => /^https:\/\//i.test(h);
const linkCls = "flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-surface-2";

/* ───────────── nearby-help lookup (client-only: real location, real OSM data) ───────────── */

const textBlock = (t: string): Block => ({ type: "text", text: t });

/** A reply this component builds itself, from real lookups — never routed through the server's hallucination guard because there's nothing here to hallucinate: it's either the person's own device location or a verified /api/resources result. */
function localReply(blocks: Block[], suggestions: string[] = []): MewviReply {
  return { intent: "find_nearby_help", engine: "local", ai: "off", blocks, confirmations: [], suggestions };
}

function lookingReply(category: NearbyCategory): MewviReply {
  return localReply([textBlock(`Let me check what's nearby for ${category.label}…`)]);
}

function askLocationReply(category: NearbyCategory, reason: string): MewviReply {
  return localReply([textBlock(`${reason} Tell me your area, locality or city — like you would on Google Maps — and I'll look for the nearest ${category.label} there.`)]);
}

function placesReply(category: NearbyCategory, result: Extract<NearbyResult, { ok: true }>): MewviReply {
  const blocks: Block[] = [];
  if (result.places.length === 0) {
    blocks.push(textBlock(`I didn't find a mapped ${category.label} within 3 km on OpenStreetMap. Coverage can be incomplete — try the Safety Map for a wider search.`));
    const links = [routeLink("safety-map-area"), routeLink("safety-map")].filter((x): x is LinkRef => Boolean(x));
    if (links.length) blocks.push({ type: "links", items: links });
  } else {
    blocks.push(textBlock(`Nearest mapped ${category.label}${result.places.length > 1 ? "s" : ""} — from OpenStreetMap, so always confirm when it matters:`));
    blocks.push({ type: "places", label: category.label, items: result.places });
  }
  if (category.helplineIds?.length) blocks.push({ type: "helplines", items: refsFor(category.helplineIds) });
  blocks.push({ type: "notice", tone: "info", text: "If you need help right now, don't search — call 112." });
  return localReply(blocks, ["Share my location", "Find the safest route"]);
}

function errorReply(message: string): MewviReply {
  return localReply([textBlock(message)]);
}

/* ───────────── confirmation (the only route to a call / share / check-in) ───────────── */

function ConfirmCard({ c, onYes, onNo }: { c: Confirmation; onYes: () => void; onNo: () => void }) {
  const yes = "inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground";
  return (
    <div role="group" aria-label="Please confirm" className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
      <p className="text-sm font-medium">{c.prompt}</p>
      {c.detail && <p className="mt-1 text-xs text-muted">{c.detail}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {c.href.startsWith("tel:") ? (
          <a href={c.href} className={yes}>
            <Phone className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {c.yesLabel}
          </a>
        ) : isInternal(c.href) ? (
          <Link href={c.href} onClick={onYes} className={yes}>
            {c.yesLabel}
          </Link>
        ) : null}
        <button type="button" onClick={onNo} className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm hover:bg-surface-2">
          {c.noLabel}
        </button>
      </div>
    </div>
  );
}

/* ───────────── blocks ───────────── */

function HelplineCards({ items }: { items: HelplineRef[] }) {
  // Tapping "Call" only PROPOSES the call; the same confirmation card must be accepted.
  const [asking, setAsking] = useState<string | null>(null);
  const [declined, setDeclined] = useState<string[]>([]);
  return (
    <div className="space-y-2">
      {items.map((h) => {
        const c = asking === h.id && !declined.includes(h.id) ? callConfirmation(h.id) : undefined;
        return (
          <div key={h.id} className="rounded-xl border border-border bg-background p-3">
            <p className="text-sm font-medium">{h.name}</p>
            <p className={h.dialable ? "mt-0.5 text-lg font-semibold tracking-tight" : "mt-0.5 text-sm text-muted"}>{h.number}</p>
            <p className="text-xs text-muted">
              {h.availability}
              {h.publisher ? ` · Verified against ${h.publisher} (${h.verifiedOn})` : ""}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {h.dialable && (
                <button type="button" onClick={() => setAsking(h.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground">
                  <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                  Call…
                </button>
              )}
              {h.website && isHttps(h.website) && (
                <a href={h.website} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm hover:bg-surface-2">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  Website
                </a>
              )}
            </div>
            {c && <ConfirmCard c={c} onYes={() => setAsking(null)} onNo={() => setDeclined((d) => [...d, h.id])} />}
          </div>
        );
      })}
    </div>
  );
}

function BlockView({ b, onNavigate }: { b: Block; onNavigate: () => void }) {
  switch (b.type) {
    case "text":
      return <p className="text-sm leading-relaxed">{b.text}</p>;
    case "notice": {
      const Icon = b.tone === "info" ? Info : AlertTriangle;
      return (
        <div className={cn("flex gap-2 rounded-xl border p-2.5 text-xs", b.tone === "urgent" ? "border-emergency/40 bg-emergency/10" : b.tone === "warn" ? "border-amber-500/30 bg-amber-500/10" : "border-border bg-surface-2/60")}>
          <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{b.text}</span>
        </div>
      );
    }
    case "steps":
      return (
        <div>
          {b.title && <p className="text-sm font-semibold">{b.title}</p>}
          <ol className="mt-1.5 list-decimal space-y-1.5 pl-5 text-sm">
            {b.steps.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ol>
        </div>
      );
    case "helplines":
      return <HelplineCards items={b.items} />;
    case "places":
      return (
        <ul className="space-y-1.5">
          {b.items.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm">
              <span className="flex min-w-0 items-start gap-2">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{p.name}</span>
                  <span className="block text-xs text-muted">{p.distanceLabel} away</span>
                </span>
              </span>
              <a href={p.mapsHref} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-surface-2">
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
                Directions
              </a>
            </li>
          ))}
        </ul>
      );
    case "links":
      return (
        <ul className="space-y-1.5">
          {b.items.map((l) => (
            <li key={l.href + l.label}>
              {isInternal(l.href) ? (
                <Link href={l.href} onClick={onNavigate} className={linkCls}>
                  <span>
                    <span className="block font-medium">{l.label}</span>
                    {l.description && <span className="block text-xs text-muted">{l.description}</span>}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </Link>
              ) : isHttps(l.href) ? (
                <a href={l.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                  <span className="font-medium">{l.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      );
    case "path":
      return (
        <div>
          <p className="text-sm font-semibold">{b.title}</p>
          <ol className="mt-2 space-y-2">
            {b.steps.map((s, i) => {
              const inner = (
                <>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                  <span className="text-sm">
                    <span className="block font-medium">{s.label}</span>
                    {s.note && <span className="block text-xs text-muted">{s.note}</span>}
                  </span>
                </>
              );
              const cls = "flex items-start gap-2.5 rounded-xl border border-border bg-background p-2.5";
              return (
                <li key={s.label}>
                  {s.href && isInternal(s.href) ? (
                    <Link href={s.href} onClick={onNavigate} className={cn(cls, "hover:bg-surface-2")}>{inner}</Link>
                  ) : s.href && isHttps(s.href) ? (
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:bg-surface-2")}>{inner}</a>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      );
  }
}

/* ───────────── panel ───────────── */

export function MewviPanel({
  onClose,
  turns,
  setTurns,
}: {
  onClose: () => void;
  turns: MewviTurn[];
  setTurns: React.Dispatch<React.SetStateAction<MewviTurn[]>>;
}) {
  const pathname = usePathname() ?? "/";
  const { journey } = useSaved();
  const activeJourney = Boolean(journey && journey.status === "active");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  // Set right after Mewvi asks "tell me your area" — the NEXT message is
  // treated as a place name for this category instead of a fresh question,
  // unless it clearly reclassifies as something else (see send()).
  const [pendingCategory, setPendingCategory] = useState<NearbyCategory | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const chips = contextSuggestions(pageContext(pathname).domain);
  const domain = pageContext(pathname).domain;

  async function runGeolocation(category: NearbyCategory) {
    const fixResult = await getCurrentFix();
    if (fixResult.ok) {
      const result = await lookupNearby(fixResult.fix, category);
      setTurns((t) => [...t, { id: newId(), role: "mewvi", reply: result.ok ? placesReply(category, result) : errorReply(result.error) }]);
      return;
    }
    const reason =
      fixResult.state === "denied"
        ? "I can't read your location — access is off for this site, and only you can turn that back on in your browser or phone settings."
        : fixResult.state === "unsupported" || fixResult.state === "insecure"
          ? "I can't read your location here."
          : "I couldn't get a location fix just now.";
    setPendingCategory(category);
    setTurns((t) => [...t, { id: newId(), role: "mewvi", reply: askLocationReply(category, reason) }]);
  }

  async function runLocationText(placeText: string, category: NearbyCategory) {
    const g = await api.geocode(placeText);
    const place = g.ok ? g.data?.results?.[0] : undefined;
    if (!place) {
      setPendingCategory(category);
      setTurns((t) => [...t, { id: newId(), role: "mewvi", reply: errorReply(`I couldn't find "${placeText}" — try a locality, landmark or city name instead.`) }]);
      return;
    }
    const result = await lookupNearby({ lat: place.lat, lng: place.lng }, category);
    setTurns((t) => [...t, { id: newId(), role: "mewvi", reply: result.ok ? placesReply(category, result) : errorReply(result.error) }]);
  }

  useEffect(() => {
    // Autofocus only on devices with a real keyboard. On touch devices,
    // autofocusing immediately pops the OS keyboard up the instant the panel
    // opens — combined with the panel's own entrance animation this reads as
    // a jarring "zoom". Touch users can just tap the input themselves.
    const coarsePointer = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
    if (!coarsePointer) inputRef.current?.focus();
  }, []);
  useEffect(() => endRef.current?.scrollIntoView({ block: "end" }), [turns, busy]);

  async function send(raw: string) {
    const message = raw.trim().slice(0, 500);
    if (!message || busy) return;
    setValue("");
    setTurns((t) => [...t, { id: newId(), role: "user", text: message }]);
    setBusy(true);

    // Mewvi just asked "tell me your area" — treat this message as that place,
    // unless it clearly reads as an unrelated request instead (danger, a
    // different tool, etc.), in which case fall through to a normal answer.
    if (pendingCategory) {
      const category = pendingCategory;
      setPendingCategory(null);
      if (classify(message, domain).confidence < 0.6) {
        await runLocationText(message, category);
        setBusy(false);
        return;
      }
    }

    const reply = await askMewvi({ message, pathname, activeJourney });

    if (reply.intent === "find_nearby_help") {
      const category = detectNearbyCategory(message);
      if (category) {
        setTurns((t) => [...t, { id: newId(), role: "mewvi", reply: lookingReply(category) }]);
        await runGeolocation(category);
        setBusy(false);
        return;
      }
    }

    setTurns((t) => [...t, { id: newId(), role: "mewvi", reply }]);
    setBusy(false);
  }

  const dismiss = (turnId: string, confId: string) =>
    setTurns((all) => all.map((t) => (t.id === turnId ? { ...t, dismissed: [...(t.dismissed ?? []), confId] } : t)));

  const lastMewvi = [...turns].reverse().find((t) => t.role === "mewvi");

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mewvi assistant"
        className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[85vh] w-full max-w-md animate-panel-in flex-col rounded-t-2xl border border-border bg-surface shadow-soft-hover sm:bottom-6 sm:left-auto sm:right-6 sm:rounded-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between rounded-t-2xl border-b border-border bg-gradient-to-b from-surface-2/60 to-transparent px-4 py-3">
          <div className="flex items-center gap-2.5">
            <MewviAvatar size={32} online />
            <span>
              <span className="block font-semibold leading-tight">Mewvi</span>
              <span className="block text-xs leading-tight text-muted">Your ASSURED guide</span>
            </span>
          </div>
          <button onClick={onClose} aria-label="Close Mewvi" className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
          <div className="flex items-end gap-2">
            <MewviAvatar size={22} />
            <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-surface-2 px-3 py-2.5 text-sm">
              Hi, I&apos;m Mewvi. Tell me what&apos;s happening or what you need, and I&apos;ll take you to the right place in ASSURED. If you are in danger, call 112 first.
            </div>
          </div>

          {turns.length === 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">Try one of these</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {chips.map((c) => (
                  <button key={c} type="button" onClick={() => send(c)} className="rounded-full border border-border px-3 py-1.5 text-left text-sm transition-colors hover:border-primary/30 hover:bg-primary/5">
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {turns.map((t) =>
            t.role === "user" ? (
              <div key={t.id} className="ml-8 animate-bubble-in rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground">
                {t.text}
              </div>
            ) : t.reply ? (
              <div key={t.id} className="flex items-start gap-2">
                <MewviAvatar size={22} className="mt-0.5" />
                <div className={cn("min-w-0 flex-1 animate-bubble-in space-y-3 rounded-2xl rounded-bl-sm border p-3", t.reply.urgent ? "border-emergency/50 bg-emergency/5" : "border-border bg-background")}>
                  {t.reply.blocks.map((b, i) => (
                    <BlockView key={i} b={b} onNavigate={onClose} />
                  ))}
                  {t.reply.confirmations
                    .filter((c) => !(t.dismissed ?? []).includes(c.id))
                    .map((c) => (
                      <ConfirmCard key={c.id} c={c} onYes={onClose} onNo={() => dismiss(t.id, c.id)} />
                    ))}
                  {t.reply.offline && <p className="text-[11px] text-muted">You seem to be offline, so I answered with the guidance built into this page.</p>}
                  {!t.reply.offline && (t.reply.ai === "invalid_key" || t.reply.ai === "rate_limited" || t.reply.ai === "unavailable") && (
                    <p className="text-[11px] text-muted">Smart matching is unavailable right now, so I used my built-in matching.</p>
                  )}
                </div>
              </div>
            ) : null
          )}

          {busy && (
            <div className="flex items-center gap-2 pl-1 text-sm text-muted" role="status">
              <MewviAvatar size={22} />
              <span className="flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1.5">
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Thinking…
              </span>
            </div>
          )}

          {!busy && lastMewvi?.reply && lastMewvi.reply.suggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 pl-1">
              {lastMewvi.reply.suggestions.map((s) => (
                <button key={s} type="button" onClick={() => send(s)} className="rounded-full border border-primary/25 bg-primary/5 px-3 py-1.5 text-left text-xs font-medium text-primary transition-colors hover:bg-primary/10">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form
          className="flex items-center gap-2 border-t border-border px-3 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send(value);
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            maxLength={500}
            placeholder="Ask Mewvi to find something…"
            // text-base (16px), not text-sm: a smaller font on an autofocused
            // input makes iOS/Android browsers zoom the whole page in on focus.
            className="h-11 flex-1 rounded-xl border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary sm:text-sm"
            aria-label="Message Mewvi"
          />
          <button type="submit" aria-label="Send" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-soft transition-all duration-150 ease-calm hover:-translate-y-0.5 hover:shadow-soft-hover active:translate-y-0 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none" disabled={!value.trim() || busy}>
            <Send className="h-4 w-4" aria-hidden="true" />
          </button>
        </form>
        <p className="px-4 pb-3 pt-2 text-[11px] leading-snug text-muted">{DISCLAIMER}</p>
      </div>
    </>
  );
}
