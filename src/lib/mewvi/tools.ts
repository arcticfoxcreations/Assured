// src/lib/mewvi/tools.ts
//
// Mewvi's internal tools. Two rules hold for every one of them:
//   1. Facts (numbers, sites, official links) come from the verified dataset
//      or the route table — never from a model, never typed from memory.
//   2. Sensitive actions (calling, sharing location, starting a check-in) are
//      only PROPOSED as a Confirmation. Nothing runs until the person taps Yes.
import { isDialable, nationalHelplines, telHref } from "@/lib/helplines";
import { getRoute, routes } from "@/lib/navigation";
import { guideLink, helplineById, helplineLink, refsFor, routeLink, TOPIC_HELPLINES } from "./catalog";
import { normalize } from "./text";
import type { Block, Confirmation, LinkRef, PathStep, ToolResult, TopicId } from "./types";

const text = (t: string): Block => ({ type: "text", text: t });
const links = (items: (LinkRef | undefined)[]): Block => ({ type: "links", items: items.filter((x): x is LinkRef => Boolean(x)) });
const first = <T,>(...xs: (T | undefined)[]): T | undefined => xs.find((x) => x !== undefined);

/* ───────────── confirmations (the only way to reach a sensitive action) ───────────── */

export function callConfirmation(helplineId: string): Confirmation | undefined {
  const h = helplineById(helplineId);
  if (!h || !isDialable(h)) return undefined;
  return {
    id: `call-${h.id}`,
    kind: "call",
    prompt: `Would you like to open the call option for ${h.number}?`,
    detail: `${h.name}. This opens your phone's dialer — nothing is dialled until you press call there.`,
    yesLabel: "Yes, open call",
    noLabel: "Not now",
    href: telHref(h.number),
  };
}

/** shareLocation(): proposes opening Share Location. It never reads or sends a location itself. */
export function shareLocation(): ToolResult {
  const r = getRoute("location-share");
  return {
    found: Boolean(r),
    blocks: [text("I can take you to Share Location, where you choose who receives it.")],
    confirmations: r
      ? [
          {
            id: "share-location",
            kind: "share-location",
            prompt: "Would you like to share your location?",
            detail:
              "I'll open the Share Location page. ASSURED reads your location only when you tap the button there, and nothing is sent until you pick an app and press send.",
            yesLabel: "Yes, open Share Location",
            noLabel: "Not now",
            href: r.href,
          },
        ]
      : [],
    suggestions: ["How can my friend track me?"],
  };
}

/** startCheckIn(): proposes opening the Safety Check-In form. Nothing starts until the person submits it. */
export function startCheckIn(activeJourney = false): ToolResult {
  const r = getRoute("travel-check-in");
  return {
    found: Boolean(r),
    blocks: [
      text(
        activeJourney
          ? "You already have a journey running on this device. The check-in page shows it and lets you extend, mark yourself safe or get help."
          : "A safety check-in lets you set a destination and an arrival time, then tell ASSURED when you're safe."
      ),
    ],
    confirmations: r
      ? [
          {
            id: "start-check-in",
            kind: "start-check-in",
            prompt: activeJourney ? "Would you like to open your check-in?" : "Would you like to open the Safety Check-In form?",
            detail: "Nothing starts until you confirm on that page. You choose the destination, the time and who to notify.",
            yesLabel: "Yes, open Check-In",
            noLabel: "Not now",
            href: r.href,
          },
        ]
      : [],
    suggestions: ["How can my friend track me?", "Find the safest route"],
  };
}

/* ───────────── navigation ───────────── */

/** navigateTo(): only ever resolves to a page that exists in navigation.ts. */
export function navigateTo(target: string): ToolResult {
  const r = getRoute(target) ?? routes.find((x) => x.href === target);
  if (!r) {
    return {
      found: false,
      blocks: [text("I couldn't find a page for that in ASSURED.")],
      confirmations: [],
    };
  }
  return {
    found: true,
    blocks: [links([{ label: `Open ${r.label}`, href: r.href, description: r.description }])],
    confirmations: [],
  };
}

/* ───────────── helplines ───────────── */

const STOP = new Set(["the", "and", "for", "you", "can", "how", "what", "who", "need", "want", "get", "find", "any", "there", "with", "that", "this", "please", "help", "number", "numbers", "helpline", "helplines", "contact", "call", "give", "tell", "about", "have", "are", "from", "your", "india"]);

function tokens(query: string): string[] {
  return normalize(query)
    .split(" ")
    .filter((t) => t.length >= 3 && !STOP.has(t));
}

function textSearch(query: string, limit: number): string[] {
  const toks = tokens(query);
  if (toks.length === 0) return [];
  const scored = nationalHelplines
    .map((h) => {
      const name = normalize(h.name);
      const cats = h.category.map(normalize).join(" ");
      const desc = normalize(h.description);
      const num = h.number.replace(/[^0-9]/g, "");
      let s = 0;
      for (const t of toks) {
        // A person who types "call 1930" means that exact, verified number.
        if (/^\d+$/.test(t) && num !== "" && num === t) s += 6;
        if (name.includes(t)) s += 3;
        if (cats.includes(t)) s += 3;
        if (desc.includes(t)) s += 1;
      }
      return { id: h.id, s };
    })
    .filter((x) => x.s >= 3)
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, limit).map((x) => x.id);
}

export interface HelplineSearch {
  query?: string;
  topic?: TopicId;
  wantsCall?: boolean;
  limit?: number;
}

const CALL_FIRST_TOPICS: TopicId[] = ["police", "ambulance", "fire", "emergency"];

/** searchHelplines(): reads the verified directory only. If nothing matches it says so instead of guessing. */
export function searchHelplines({ query = "", topic, wantsCall = false, limit = 3 }: HelplineSearch): ToolResult {
  const ids = topic ? TOPIC_HELPLINES[topic].primary : textSearch(query, limit);
  const refs = refsFor(ids, limit);

  if (refs.length === 0) {
    return {
      found: false,
      blocks: [
        text("I couldn't find a verified helpline for that in ASSURED's directory, and I won't guess a number."),
        links([routeLink("helplines", "", "Browse all verified helplines")]),
      ],
      confirmations: [],
      suggestions: ["I need the police", "I need the women helpline"],
    };
  }

  const blocks: Block[] = [{ type: "helplines", items: refs }];
  const hub = topic ? getRoute(TOPIC_HELPLINES[topic].hub) : undefined;
  if (hub && hub.id !== "emergency") {
    blocks.push(links([{ label: `More about ${TOPIC_HELPLINES[topic!].label}`, href: hub.href, description: hub.description }]));
  }

  const confirmations: Confirmation[] = [];
  const shouldOfferCall = wantsCall || (topic !== undefined && CALL_FIRST_TOPICS.includes(topic));
  if (shouldOfferCall) {
    const dialable = refs.find((r) => r.dialable);
    const c = dialable ? callConfirmation(dialable.id) : undefined;
    if (c) confirmations.push(c);
  }
  return { found: true, blocks, confirmations };
}

/* ───────────── nearby help ───────────── */

/** findNearbyHelp(): points at Area Safety. Mewvi itself never reads or sends a location. */
export function findNearbyHelp(): ToolResult {
  return {
    found: true,
    blocks: [
      text(
        "I can't see where you are, and I never read your location. The Area Safety page shows police stations, hospitals and fire stations around an area you choose. Its map data comes from OpenStreetMap, so it's community-mapped — check before you rely on it."
      ),
      links([routeLink("safety-map-area"), routeLink("safety-map")]),
      { type: "helplines", items: refsFor(["erss-112"]) },
      { type: "notice", tone: "info", text: "If you need help right now, don't search — call 112." },
    ],
    confirmations: [],
    suggestions: ["Share my location", "Find the safest route"],
  };
}

/* ───────────── resource search ───────────── */

interface Candidate {
  routeId: string;
  suffix?: string;
  re: RegExp;
  base: number;
}

function pickLinks(query: string, candidates: Candidate[], limit: number): LinkRef[] {
  const n = normalize(query);
  return candidates
    .map((c) => ({ c, s: c.base + (c.re.test(n) ? 5 : 0) }))
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ c }) => routeLink(c.routeId, c.suffix))
    .filter((x): x is LinkRef => Boolean(x));
}

/** searchCyberResources(): the cyber guides, evidence tools and verified cyber helplines. */
export function searchCyberResources(query = ""): ToolResult {
  const items = pickLinks(
    query,
    [
      { routeId: "report-financial-fraud", re: /\b(financ\w*|upi|bank|money|payment|otp|card|loan|investment)\b/, base: 2 },
      { routeId: "cyber-scam-call", re: /\b(call|caller|message|sms|text|link|scam)\b/, base: 2 },
      { routeId: "report-cyber", re: /\b(report|harass\w*|threat\w*|blackmail\w*|hack\w*|account)\b/, base: 3 },
      { routeId: "evidence", re: /\b(evidence|screenshot\w*|proof|keep)\b/, base: 1 },
      { routeId: "cyber", re: /\b(learn|guide|safety)\b/, base: 0 },
    ],
    4
  );
  return {
    found: true,
    blocks: [text("Here's what ASSURED has for cyber safety."), links(items), { type: "helplines", items: refsFor(TOPIC_HELPLINES.cyber.primary, 2) }],
    confirmations: [],
    suggestions: ["Someone is threatening me online", "I got a suspicious call"],
  };
}

/** searchWomenResources(): women's-safety guides, tools and verified helplines. */
export function searchWomenResources(query = ""): ToolResult {
  const items = pickLinks(
    query,
    [
      { routeId: "report-women", re: /\b(report|harass\w*|stalk\w*|complain\w*|abuse\w*|assault\w*)\b/, base: 3 },
      { routeId: "travel-guardian", re: /\b(track\w*|guardian|friend|family|journey|travel)\b/, base: 2 },
      { routeId: "location-share", re: /\b(share|location)\b/, base: 2 },
      { routeId: "women", re: /\b(learn|guide|safety|resources?)\b/, base: 1 },
      { routeId: "travel-check-in", re: /\b(check ?in|timer|arrive)\b/, base: 1 },
    ],
    4
  );
  return {
    found: true,
    blocks: [text("Here's what ASSURED has for women's safety."), links(items), { type: "helplines", items: refsFor(TOPIC_HELPLINES.women.primary, 2) }],
    confirmations: [],
    suggestions: ["Someone is following me", "How do I share my location?"],
  };
}

/** searchTravelTools(): the journey, tracking, route and map tools. */
export function searchTravelTools(query = ""): ToolResult {
  const items = pickLinks(
    query,
    [
      { routeId: "travel-check-in", re: /\b(check ?in|timer|arrive|arrival|journey|start)\b/, base: 1 },
      { routeId: "travel-guardian", re: /\b(track\w*|guardian|friend|family|follow)\b/, base: 1 },
      { routeId: "guardian", re: /\b(guardian (?:view|link)|link)\b/, base: 0 },
      { routeId: "travel-routes", re: /\b(routes?|road|way|safest|directions?)\b/, base: 1 },
      { routeId: "location-share", re: /\b(share|location)\b/, base: 1 },
      { routeId: "safety-map", re: /\b(map|area|unsafe)\b/, base: 0 },
      { routeId: "community", re: /\b(community|report unsafe)\b/, base: 0 },
    ],
    3
  );
  return {
    found: items.length > 0,
    blocks: [text("These travel tools might help."), links(items)],
    confirmations: [],
    suggestions: ["How do I start a safety check-in?", "Find the safest route"],
  };
}

/* ───────────── report assistant ───────────── */

const EVIDENCE_CATEGORY: Partial<Record<TopicId, string>> = {
  "online-harassment": "online-harassment",
  financial: "financial-fraud",
  hacked: "hacked-account",
  "lost-phone": "lost-phone",
  women: "stalking-harassment",
  workplace: "workplace-harassment",
};

const ncrpUrl = () => first(guideLink("cyber", "ncrp")?.href, helplineLink("ncrp-portal")?.href);

export interface ReportPath {
  title: string;
  steps: PathStep[];
  helplineIds: string[];
}

/** The guided path a person follows to prepare an official complaint. ASSURED never submits anything for them. */
export function reportPath(topic: TopicId | undefined): ReportPath | undefined {
  const ev = topic && EVIDENCE_CATEGORY[topic] ? `?category=${EVIDENCE_CATEGORY[topic]}` : "";
  const evidenceStep: PathStep = {
    label: "Evidence",
    note: "Organise screenshots, dates and a timeline on your own device.",
    href: `/evidence${ev}`,
  };

  switch (topic) {
    case "online-harassment":
      return {
        title: "Report online harassment",
        helplineIds: ["ncrp-portal", "cybercrime-1930"],
        steps: [
          { label: "Cyber Safety", note: "Guidance on scams, hacked accounts and online harassment.", href: "/cyber" },
          { label: "Online harassment", note: "What to do now, who to contact and what to keep.", href: "/report/cyber" },
          evidenceStep,
          { label: "Report", note: "File on the National Cyber Crime Reporting Portal.", href: ncrpUrl(), external: true },
        ],
      };
    case "financial":
      return {
        title: "Report financial fraud",
        helplineIds: ["cybercrime-1930", "ncrp-portal"],
        steps: [
          { label: "Call 1930 if money just moved", note: "Speed can matter for freezing funds." },
          { label: "Financial fraud guide", note: "What to do now and what to keep.", href: "/report/financial-fraud" },
          evidenceStep,
          { label: "Report", note: "File on the National Cyber Crime Reporting Portal.", href: ncrpUrl(), external: true },
        ],
      };
    case "hacked":
    case "cyber":
      return {
        title: "Report a cybercrime",
        helplineIds: ["cybercrime-1930", "ncrp-portal"],
        steps: [
          { label: "Cyber Safety", href: "/cyber" },
          { label: "Cybercrime guide", note: "What to do now, who to contact and what to keep.", href: "/report/cyber" },
          evidenceStep,
          { label: "Report", note: "File on the National Cyber Crime Reporting Portal.", href: ncrpUrl(), external: true },
        ],
      };
    case "lost-phone":
      return {
        title: "Lost or stolen phone",
        helplineIds: ["sancharsaathi"],
        steps: [
          { label: "Cybercrime guide", href: "/report/cyber" },
          { label: "Sanchar Saathi", note: "Block or trace the phone.", href: helplineLink("sancharsaathi")?.href, external: true },
          evidenceStep,
          { label: "Police complaint", note: "File one at your nearest police station if the phone was stolen." },
        ],
      };
    case "women":
    case "workplace": {
      const official =
        topic === "workplace"
          ? { label: "Report on SHe-Box", note: "The official portal for workplace harassment complaints.", href: first(guideLink("women", "shebox")?.href, helplineLink("shebox-portal")?.href) }
          : { label: "Report", note: "Register a complaint with the National Commission for Women, or call the women helpline.", href: first(guideLink("women", "ncw")?.href, helplineLink("ncw-complaint")?.href) };
      return {
        title: topic === "workplace" ? "Report workplace harassment" : "Report harassment or stalking",
        helplineIds: topic === "workplace" ? ["shebox-portal", "women-181"] : ["women-181", "ncw-complaint"],
        steps: [
          { label: "Women's Safety", href: "/women" },
          { label: "Reporting guide", note: "What to do now, who to contact and what to keep.", href: "/report/women" },
          evidenceStep,
          { ...official, external: true },
        ],
      };
    }
    case "child":
      return {
        title: "Report a child safety concern",
        helplineIds: ["child-1098", "ncrp-portal"],
        steps: [
          { label: "Child Safety", href: "/children" },
          { label: "Child helpline", note: "For any child in need of care and protection." },
          { label: "Report online content", note: "Use the National Cyber Crime Reporting Portal for online abuse.", href: ncrpUrl(), external: true },
        ],
      };
    default:
      return undefined;
  }
}

/** prepareReport(): builds the guided path. Never files anything on the person's behalf. */
export function prepareReport(topic?: TopicId): ToolResult {
  const path = reportPath(topic);
  if (!path) {
    return {
      found: false,
      blocks: [
        text("Tell me a little about what happened and I'll point you to the right place — or pick a category."),
        links([
          routeLink("report-cyber"),
          routeLink("report-financial-fraud"),
          routeLink("report-women"),
          routeLink("children"),
        ]),
      ],
      confirmations: [],
      suggestions: ["Someone is threatening me online", "I got scammed online", "I need to report harassment"],
    };
  }
  const steps = path.steps.map((s) => (s.external && !s.href ? { ...s, external: false } : s));
  return {
    found: true,
    blocks: [
      { type: "path", title: path.title, steps },
      { type: "helplines", items: refsFor(path.helplineIds, 2) },
      { type: "notice", tone: "info", text: "ASSURED never submits a report for you. These steps get you ready to do it yourself." },
    ],
    confirmations: [],
    suggestions: ["What evidence should I keep?"],
  };
}

export const tools = {
  searchHelplines,
  findNearbyHelp,
  navigateTo,
  searchCyberResources,
  searchWomenResources,
  searchTravelTools,
  startCheckIn,
  prepareReport,
  shareLocation,
} as const;
export type ToolName = keyof typeof tools;
