// src/lib/mewvi/context.ts — which ASSURED page is the person on? Isomorphic.
import type { IntentId, TopicId } from "./types";

export type Domain =
  | "home"
  | "emergency"
  | "helplines"
  | "report"
  | "cyber"
  | "women"
  | "children"
  | "travel"
  | "community"
  | "evidence"
  | "safety"
  | "settings"
  | "other";

export interface PageContext {
  pathname: string;
  domain: Domain;
}

// Order matters: most specific prefix first.
const PREFIXES: [string, Domain][] = [
  ["/report/women", "women"],
  ["/report/cyber", "cyber"],
  ["/report/financial-fraud", "cyber"],
  ["/report", "report"],
  ["/cyber", "cyber"],
  ["/women", "women"],
  ["/children", "children"],
  ["/travel", "travel"],
  ["/location", "travel"],
  ["/guardian", "travel"],
  ["/community", "community"],
  ["/safety-map", "community"],
  ["/safety", "safety"],
  ["/evidence", "evidence"],
  ["/settings", "settings"],
  ["/emergency", "emergency"],
  ["/helplines", "helplines"],
];

/** Accepts anything (it comes from the network) and always returns a safe context. */
export function pageContext(pathname?: string): PageContext {
  let p = typeof pathname === "string" ? pathname.split(/[?#]/)[0].toLowerCase() : "/";
  if (!/^\/[a-z0-9\-/]*$/.test(p) || p.length > 100) p = "/";
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  if (p === "/") return { pathname: "/", domain: "home" };
  for (const [prefix, domain] of PREFIXES) {
    if (p === prefix || p.startsWith(`${prefix}/`)) return { pathname: p, domain };
  }
  return { pathname: p, domain: "other" };
}

/** A small nudge (added only to intents that already matched) so the page the person is on breaks ties. */
export function contextBoost(domain: Domain): Partial<Record<IntentId, number>> {
  switch (domain) {
    case "cyber":
      return { flow_financial_fraud: 1, flow_online_harassment: 1, flow_suspicious_message: 1, flow_scam_call: 1, flow_hacked_account: 1, evidence: 1, report: 1 };
    case "women":
      return { report: 1, flow_followed: 1, share_location: 1, helpline_search: 1 };
    case "children":
      return { report: 1, helpline_search: 1 };
    case "travel":
      return { track_me: 1, share_location: 1, start_checkin: 1, safe_routes: 1, flow_unsafe_transport: 1, flow_unfamiliar_location: 1 };
    case "emergency":
      return { helpline_search: 1, share_location: 1, emergency_danger: 1 };
    case "report":
      return { report: 1, evidence: 1 };
    case "evidence":
      return { evidence: 1, report: 1 };
    case "community":
      return { safety_map: 1, community_report: 1, safe_routes: 1 };
    default:
      return {};
  }
}

/** When someone says "report this" / "helpline" with no topic, the page they're on supplies one. */
export function contextTopic(domain: Domain): TopicId | undefined {
  if (domain === "cyber") return "cyber";
  if (domain === "women") return "women";
  if (domain === "children") return "child";
  return undefined;
}

const DEFAULT_CHIPS = ["Find a helpline", "Start a safety check-in", "I need to report something", "Share my location"];

/** Starter chips that match the page. Each chip is a normal message the router understands. */
export function contextSuggestions(domain: Domain): string[] {
  switch (domain) {
    case "cyber":
      return ["I got scammed online", "Where do I report financial fraud?", "Someone is threatening me online", "I got a suspicious call"];
    case "women":
      return ["I need the women helpline", "Someone is following me", "I need to report harassment", "How do I share my location?"];
    case "children":
      return ["I need the child helpline", "How do I report a child safety concern?"];
    case "travel":
      return ["How can my friend track me?", "How do I start a safety check-in?", "Find the safest route", "I feel unsafe in this cab"];
    case "emergency":
      return ["I need the police", "Share my location", "Someone is following me"];
    case "report":
    case "evidence":
      return ["What evidence should I keep?", "I need to report harassment", "Where do I report financial fraud?"];
    case "community":
      return ["Show nearby help", "Is this area safe?", "Find the safest route"];
    case "safety":
      return ["Share my location", "I need the police", "Someone is following me"];
    default:
      return DEFAULT_CHIPS;
  }
}
