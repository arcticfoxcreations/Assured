// src/lib/mewvi/catalog.ts
//
// The verified catalog Mewvi is allowed to draw facts from. Everything a
// person could act on — phone numbers, websites, official links — comes from
// ASSURED's verified datasets. Nothing in Mewvi's replies is typed from memory.
import { nationalHelplines, stateList, isDialable, getSource, helplineSources } from "@/lib/helplines";
import { getReportGuide } from "@/lib/reportGuides";
import { routes, getRoute } from "@/lib/navigation";
import type { Helpline } from "@/types/helpline";
import type { HelplineRef, LinkRef, TopicId } from "./types";

export function helplineById(id: string): Helpline | undefined {
  return nationalHelplines.find((h) => h.id === id);
}

export function toRef(h: Helpline): HelplineRef {
  return {
    id: h.id,
    name: h.name,
    number: h.number,
    dialable: isDialable(h),
    availability: h.availability,
    website: h.website,
    publisher: getSource(h.sourceId)?.publisher,
    verifiedOn: h.verifiedOn,
  };
}

export function refsFor(ids: string[], limit = 3): HelplineRef[] {
  const out: HelplineRef[] = [];
  for (const id of ids) {
    const h = helplineById(id);
    if (h && !out.some((o) => o.id === h.id)) out.push(toRef(h));
    if (out.length >= limit) break;
  }
  return out;
}

/** Which helplines answer which topic. `primary` is shown; `hub` is the page with the full list. */
export const TOPIC_HELPLINES: Record<TopicId, { primary: string[]; hub: string; label: string }> = {
  police: { primary: ["erss-112"], hub: "emergency", label: "police" },
  ambulance: { primary: ["erss-112"], hub: "emergency", label: "ambulance" },
  fire: { primary: ["erss-112"], hub: "emergency", label: "fire" },
  emergency: { primary: ["erss-112"], hub: "emergency", label: "emergency" },
  women: { primary: ["women-181", "ncw-complaint"], hub: "women", label: "women's safety" },
  child: { primary: ["child-1098"], hub: "children", label: "child safety" },
  cyber: { primary: ["cybercrime-1930", "ncrp-portal"], hub: "cyber", label: "cybercrime" },
  financial: { primary: ["cybercrime-1930", "ncrp-portal"], hub: "cyber", label: "financial fraud" },
  "online-harassment": { primary: ["ncrp-portal", "cybercrime-1930"], hub: "cyber", label: "online harassment" },
  hacked: { primary: ["cybercrime-1930", "ncrp-portal"], hub: "cyber", label: "hacked accounts" },
  "lost-phone": { primary: ["sancharsaathi"], hub: "cyber", label: "lost or stolen phones" },
  legal: { primary: ["legal-aid-15100"], hub: "helplines", label: "legal aid" },
  "mental-health": { primary: ["telemanas"], hub: "helplines", label: "mental health support" },
  railway: { primary: ["railmadad-139"], hub: "helplines", label: "railways" },
  highway: { primary: ["nhai-1033"], hub: "helplines", label: "highways" },
  senior: { primary: ["elderline-14567"], hub: "helplines", label: "senior citizens" },
  consumer: { primary: ["consumer-nch"], hub: "helplines", label: "consumer complaints" },
  disaster: { primary: ["ndma-contact"], hub: "helplines", label: "disasters" },
  tourist: { primary: ["tourist-helpline"], hub: "helplines", label: "tourists" },
  workplace: { primary: ["shebox-portal"], hub: "women", label: "workplace harassment" },
};

/** A verified official link out of a report guide (e.g. the cybercrime portal). */
export function guideLink(guideId: string, sourceId: string): LinkRef | undefined {
  const l = getReportGuide(guideId)?.officialLinks.find((x) => x.sourceId === sourceId);
  return l ? { label: l.label, href: l.url, external: true } : undefined;
}

export function helplineLink(id: string): LinkRef | undefined {
  const h = helplineById(id);
  return h?.website ? { label: h.name, href: h.website, external: true } : undefined;
}

export function routeLink(routeId: string, hrefSuffix = "", label?: string, description?: string): LinkRef | undefined {
  const r = getRoute(routeId);
  if (!r) return undefined;
  return { label: label ?? r.label, href: `${r.href}${hrefSuffix}`, description: description ?? r.description };
}

/* ───────────── allow-lists used by the hallucination guard ───────────── */

const digitsOf = (s: string) => s.replace(/[^0-9]/g, "");

export function verifiedNumbers(): Set<string> {
  const s = new Set<string>();
  for (const h of nationalHelplines) if (isDialable(h)) s.add(digitsOf(h.number));
  return s;
}

const hostOf = (url: string): string | undefined => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return undefined;
  }
};

export function verifiedHosts(): Set<string> {
  const s = new Set<string>();
  const add = (u?: string) => {
    const h = u ? hostOf(u) : undefined;
    if (h) s.add(h);
  };
  for (const h of nationalHelplines) add(h.website);
  for (const src of helplineSources) add(src.url);
  for (const gid of ["cyber", "women", "financial-fraud"]) {
    for (const l of getReportGuide(gid)?.officialLinks ?? []) add(l.url);
  }
  return s;
}

export function verifiedEmails(): Set<string> {
  const s = new Set<string>();
  for (const h of nationalHelplines) if (h.email) s.add(h.email.toLowerCase());
  return s;
}

export function internalPaths(): Set<string> {
  return new Set(routes.map((r) => r.href));
}

/** Names of states/UTs, lower-cased, for the "state helplines are coming later" honesty note. */
export function stateNames(): string[] {
  return stateList.map((s) => s.name.toLowerCase());
}
