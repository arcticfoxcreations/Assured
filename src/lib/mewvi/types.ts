// src/lib/mewvi/types.ts
//
// Shared shapes for Mewvi. Isomorphic: this file (and everything it is
// imported alongside) runs on the server AND in the browser, so Mewvi can
// keep working offline. Nothing here may touch process.env or secrets.

export const INTENT_IDS = [
  "emergency_danger",
  "flow_followed",
  "flow_unsafe_transport",
  "flow_unfamiliar_location",
  "flow_online_harassment",
  "flow_financial_fraud",
  "flow_hacked_account",
  "flow_lost_phone",
  "flow_suspicious_message",
  "flow_scam_call",
  "mental_health",
  "helpline_search",
  "find_nearby_help",
  "share_location",
  "start_checkin",
  "track_me",
  "safe_routes",
  "safety_map",
  "community_report",
  "report",
  "evidence",
  "distress_demo",
  "navigate",
  "about",
  "greeting",
  "thanks",
  "out_of_scope",
] as const;
export type IntentId = (typeof INTENT_IDS)[number];

export const TOPIC_IDS = [
  "police",
  "ambulance",
  "fire",
  "emergency",
  "women",
  "child",
  "cyber",
  "financial",
  "online-harassment",
  "hacked",
  "lost-phone",
  "legal",
  "mental-health",
  "railway",
  "highway",
  "senior",
  "consumer",
  "disaster",
  "tourist",
  "workplace",
] as const;
export type TopicId = (typeof TOPIC_IDS)[number];

/** What the optional AI layer did (or didn't do) for one message. */
export type AiStatus = "off" | "ok" | "skipped" | "invalid_key" | "rate_limited" | "unavailable";

/** The ONLY thing an AI model is ever allowed to return: a label, never text. */
export interface Nlu {
  intent: IntentId;
  topic?: TopicId;
  /** A route id from navigation.ts. */
  target?: string;
  wantsCall?: boolean;
}

export type NluOutcome = { ok: true; nlu: Nlu } | { ok: false; reason: AiStatus };
export type NluFn = (message: string, pathname: string) => Promise<NluOutcome>;

/* ───────────── reply blocks (what the panel renders) ───────────── */

/** A helpline as shown in chat. Always hydrated from the verified dataset, never typed by hand. */
export interface HelplineRef {
  id: string;
  name: string;
  number: string;
  dialable: boolean;
  availability: string;
  website?: string;
  publisher?: string;
  verifiedOn: string;
}

export interface LinkRef {
  label: string;
  /** Internal path ("/cyber") or a verified official https URL. */
  href: string;
  description?: string;
  external?: boolean;
}

export interface PathStep {
  label: string;
  note?: string;
  href?: string;
  external?: boolean;
}

export type Block =
  | { type: "text"; text: string }
  | { type: "notice"; tone: "info" | "warn" | "urgent"; text: string }
  | { type: "steps"; title?: string; steps: string[] }
  | { type: "helplines"; items: HelplineRef[] }
  | { type: "links"; items: LinkRef[] }
  | { type: "path"; title: string; steps: PathStep[] };

/** A sensitive action Mewvi may only PROPOSE. The person must tap Yes. */
export interface Confirmation {
  id: string;
  kind: "call" | "share-location" | "start-check-in";
  prompt: string;
  detail?: string;
  yesLabel: string;
  noLabel: string;
  /** "tel:112" or an internal route. Only ever followed after an explicit Yes. */
  href: string;
}

export interface MewviReply {
  intent: IntentId;
  engine: "local" | "gemini";
  ai: AiStatus;
  urgent?: boolean;
  blocks: Block[];
  confirmations: Confirmation[];
  suggestions: string[];
  /** Set by the browser when the server couldn't be reached and the built-in logic answered. */
  offline?: boolean;
}

export interface RespondInput {
  message: string;
  pathname?: string;
  /** True when the traveller has a journey running on this device. Never contains location. */
  activeJourney?: boolean;
}

/** Result of a tool call, before it is merged into a reply. */
export interface ToolResult {
  found: boolean;
  blocks: Block[];
  confirmations: Confirmation[];
  suggestions?: string[];
}
