// src/lib/mewvi/respond.ts
//
// Mewvi's brain. Isomorphic: the API route calls it on the server, and the
// browser calls the very same function when the server can't be reached, so
// Mewvi keeps working offline with identical rules.
//
//   message ─► sanitise ─► local classifier (danger is decided HERE, always)
//           ─► [optional] AI label, only when local is unsure
//           ─► tools + flows (verified dataset only) ─► guard ─► reply
//
// A model can only ever return a *label* (intent/topic/page id). It never
// writes reply text, so it has no path to invent a number or a link.
import { contextSuggestions, contextTopic, pageContext, type PageContext } from "./context";
import { DISCLAIMER, EMERGENCY_FLOW, FLOWS, MEDICAL_FLOW, MENTAL_HEALTH_FLOW, SELF_HARM_FLOW, type Flow } from "./flows";
import { verifyReply } from "./guard";
import { AI_THRESHOLD, classify, detectTopic, isMedical, resolveTarget, type Classification } from "./intents";
import { callConfirmation, findNearbyHelp, navigateTo, prepareReport, reportPath, searchHelplines, shareLocation, startCheckIn } from "./tools";
import { helplineById, refsFor, routeLink, stateNames } from "./catalog";
import { normalize, sanitizeMessage } from "./text";
import type { AiStatus, Block, Confirmation, IntentId, MewviReply, Nlu, NluFn, RespondInput, TopicId } from "./types";

interface Parts {
  blocks: Block[];
  confirmations?: Confirmation[];
  suggestions?: string[];
  urgent?: boolean;
}

const text = (t: string): Block => ({ type: "text", text: t });
const linkBlock = (...ids: (ReturnType<typeof routeLink>)[]): Block => ({
  type: "links",
  items: ids.filter((x): x is NonNullable<typeof x> => Boolean(x)),
});

const MONEY_CUE = /\b(upi|paytm|gpay|phonepe|bank|card|otp|money|payment|transaction|rupees|account|loan|investment|crypto|wallet|kyc|deducted|debited)\b/;

/* ───────────── flows → parts ───────────── */

function extraHelplines(intent: IntentId, n: string): string[] {
  if (intent === "flow_unsafe_transport") {
    if (/\b(train|metro|rail)\b/.test(n)) return ["railmadad-139"];
    if (/\b(highway|expressway)\b/.test(n)) return ["nhai-1033"];
  }
  if (intent === "flow_unfamiliar_location" && /\b(tourist|tourism|travell?ing|visiting)\b/.test(n)) return ["tourist-helpline"];
  return [];
}

function fromFlow(flow: Flow, intent: IntentId, n: string): Parts {
  const blocks: Block[] = [text(flow.lead), { type: "steps", title: flow.title, steps: flow.steps }];

  if (flow.reportTopic) {
    const path = reportPath(flow.reportTopic);
    if (path) blocks.push({ type: "path", title: path.title, steps: path.steps });
  }

  const linkIds = flow.links.map((l) => routeLink(l.routeId, l.suffix, l.label));
  if (intent === "flow_financial_fraud") {
    // "I got scammed online" starts at Cyber Safety; explicit money/bank/UPI goes straight to the fraud guide.
    linkIds.unshift(MONEY_CUE.test(n) ? routeLink("report-financial-fraud") : routeLink("cyber"));
  }
  if (!flow.reportTopic || flow.links.length) blocks.push(linkBlock(...linkIds.slice(0, 3)));

  const refs = refsFor([...flow.helplineIds, ...extraHelplines(intent, n)], 2);
  if (refs.length) blocks.push({ type: "helplines", items: refs });
  if (flow.urgent) blocks.push({ type: "notice", tone: "info", text: DISCLAIMER });

  const confirmations: Confirmation[] = [];
  if (flow.offerCall112) {
    const c = callConfirmation("erss-112");
    if (c) confirmations.push(c);
  }
  if (flow.offerShare) confirmations.push(...shareLocation().confirmations);

  return { blocks, confirmations, suggestions: flow.suggestions, urgent: flow.urgent };
}

/* ───────────── honesty notes for helpline questions ───────────── */

const ORG_CUE = /\b(police station|thana|commissioner|dcp|customer care|customer service|bank branch|branch|airline|hotel|company|college|university|school|hospital)\b/;
// A capitalised place name after a preposition ("police in Jaipur"), ignoring topic words people capitalise ("for Women").
const PLACE_CUE = /\b(?:in|near|at|of|from|for)\s+(?:the\s+)?(?!(?:India|Indian|Women|Woman|Child|Children|Police|Cyber|Emergency|Fire|Ambulance|Senior|Legal|Railway|Mental|Tourist|Consumer|Disaster)\b)[A-Z][a-z]{2,}/;

function honestyNotices(message: string, n: string, refIds: string[]): Block[] {
  const out: Block[] = [];
  const state = stateNames().find((s) => n.includes(s));
  if (state || ORG_CUE.test(n) || PLACE_CUE.test(message)) {
    out.push({
      type: "notice",
      tone: "warn",
      text: "ASSURED's verified directory lists national helplines only. I don't have a verified number for a specific station, office, organisation or state, so I won't guess one.",
    });
    if (state) out.push(linkBlock(routeLink("helplines-states")));
  }
  if (/\b(e-?mail|mail id)\b/.test(n) && !refIds.some((id) => helplineById(id)?.email)) {
    out.push({
      type: "notice",
      tone: "info",
      text: "ASSURED doesn't hold a verified email address for these. Use the official website shown on the card.",
    });
  }
  return out;
}

/* ───────────── intent → parts ───────────── */

function compose(message: string, ctx: PageContext, nlu: Nlu, local: Classification, activeJourney: boolean): Parts {
  const n = normalize(message);
  const chips = contextSuggestions(ctx.domain);
  const topic: TopicId | undefined = nlu.topic ?? detectTopic(n);

  switch (nlu.intent) {
    case "emergency_danger":
      return fromFlow(isMedical(n) ? MEDICAL_FLOW : EMERGENCY_FLOW, nlu.intent, n);

    case "mental_health":
      return fromFlow(local.danger === "self-harm" ? SELF_HARM_FLOW : MENTAL_HEALTH_FLOW, nlu.intent, n);

    case "flow_followed":
    case "flow_unsafe_transport":
    case "flow_unfamiliar_location":
    case "flow_online_harassment":
    case "flow_financial_fraud":
    case "flow_hacked_account":
    case "flow_lost_phone":
    case "flow_suspicious_message":
    case "flow_scam_call": {
      const flow = FLOWS[nlu.intent];
      if (flow) return fromFlow(flow, nlu.intent, n);
      break;
    }

    case "helpline_search": {
      const t = topic ?? contextTopic(ctx.domain);
      const res = searchHelplines({ query: message, topic: t, wantsCall: nlu.wantsCall });
      const refIds = res.blocks.flatMap((b) => (b.type === "helplines" ? b.items.map((i) => i.id) : []));
      const notices: Block[] = res.found ? honestyNotices(message, n, refIds) : [];
      if (t === "legal") {
        notices.push({ type: "notice", tone: "info", text: "I can't give legal advice. The helpline below offers free legal aid." });
      }
      const lead = res.found ? [text(refIds.length > 1 ? "Here are the verified helplines for that." : "Here is the verified helpline for that.")] : [];
      return { blocks: [...lead, ...res.blocks, ...notices], confirmations: res.confirmations, suggestions: res.suggestions ?? chips };
    }

    case "find_nearby_help": {
      const r = findNearbyHelp();
      return { blocks: r.blocks, suggestions: r.suggestions };
    }

    case "share_location": {
      const r = shareLocation();
      return { blocks: r.blocks, confirmations: r.confirmations, suggestions: r.suggestions };
    }

    case "start_checkin": {
      const r = startCheckIn(activeJourney);
      return { blocks: r.blocks, confirmations: r.confirmations, suggestions: r.suggestions };
    }

    case "track_me": {
      const check = startCheckIn(activeJourney);
      return {
        blocks: [
          text(
            "Someone you trust can follow your journey with a private guardian link. When you start a Safety Check-In, ASSURED creates the link for you to share with them. They open it to see your route and status — it's read-only, and it stops working when your journey ends."
          ),
          linkBlock(routeLink("guardian", "", "Guardian View", "The read-only page a trusted person opens during your journey."), routeLink("travel-check-in")),
        ],
        confirmations: check.confirmations,
        suggestions: ["How do I start a safety check-in?", "Share my location"],
      };
    }

    case "safe_routes":
      return {
        blocks: [
          text("Safe Routes compares fastest, safety-focused and balanced options and shows the reasons for each. These are guidance, not guarantees."),
          linkBlock(routeLink("travel-routes")),
        ],
        suggestions: ["How do I start a safety check-in?", "Show nearby help"],
      };

    case "safety_map":
      return {
        blocks: [
          text("The Safety Map keeps official data, community reports and ASSURED's own analysis visibly separate, so you can see where each piece of information comes from."),
          linkBlock(routeLink("safety-map"), routeLink("safety-map-area")),
        ],
        suggestions: ["Show nearby help", "Find the safest route"],
      };

    case "community_report":
      return {
        blocks: [
          text("You can add a community observation about a public place. Pins are rounded to roughly a hundred metres, and reports can't include phone numbers, links or vehicle numbers."),
          linkBlock(routeLink("community")),
        ],
        suggestions: ["Is this area safe?"],
      };

    case "report": {
      const t = topic ?? contextTopic(ctx.domain);
      const fromContext = !topic && Boolean(t);
      const r = prepareReport(t);
      const sorry = /\b(attack\w*|assault\w*|rape\w*|molest\w*|kidnap\w*|abduct\w*|harass\w*|stalk\w*|groped|threat\w*)\b/.test(n);
      const lead = r.found
        ? [text(`${sorry ? "I'm sorry that happened to you. " : ""}${fromContext ? "Since you're on this page, I've assumed that's what you mean. " : ""}Here's a step-by-step way to prepare your report.`)]
        : [];
      return { blocks: [...lead, ...r.blocks], suggestions: r.suggestions ?? chips };
    }

    case "evidence": {
      const cat: Partial<Record<TopicId, string>> = { "online-harassment": "online-harassment", financial: "financial-fraud", hacked: "hacked-account", "lost-phone": "lost-phone", women: "stalking-harassment", workplace: "workplace-harassment" };
      const suffix = topic && cat[topic] ? `?category=${cat[topic]}` : "";
      return {
        blocks: [
          text("The Evidence Organizer keeps your notes, screenshots, documents and dates on this device, and builds an incident summary, a timeline and a checklist you can export. It helps you stay organised — it doesn't make anything legally admissible."),
          linkBlock(routeLink("evidence", suffix)),
        ],
        suggestions: ["Where do I report financial fraud?", "I need to report harassment"],
      };
    }

    case "distress_demo":
      return {
        blocks: [
          { type: "notice", tone: "warn", text: "Prototype and experimental. It needs microphone permission and is not a real assault detector." },
          linkBlock(routeLink("safety-distress-demo")),
        ],
        suggestions: ["Share my location"],
      };

    case "navigate": {
      const target = nlu.target ?? resolveTarget(n);
      const r = target ? navigateTo(target) : undefined;
      if (r?.found) return { blocks: r.blocks, suggestions: chips };
      return {
        blocks: [text("I couldn't tell which page you mean. Try one of these.")],
        suggestions: chips,
      };
    }

    case "about":
      return {
        blocks: [
          text("I'm Mewvi, ASSURED's guide. I help you find the right tool, helpline or report page, and I can walk you through what to do in common situations. I only use ASSURED's verified information — I don't make up phone numbers or links."),
          { type: "notice", tone: "info", text: DISCLAIMER },
        ],
        suggestions: chips,
      };

    case "greeting":
      return { blocks: [text("Hi, I'm Mewvi. What can I help you find?")], suggestions: chips };

    case "thanks":
      return { blocks: [text("You're welcome. Stay safe — I'm here if you need anything else.")], suggestions: chips };

    case "out_of_scope":
      break;
  }

  const injection = /\b(ignore|system prompt|jailbreak|pretend|you are now|disregard|developer mode|reveal)\b/.test(n);
  return {
    blocks: [
      text(
        injection
          ? "I can't change how I work, but I'm happy to help with ASSURED — helplines, reporting, travel safety and what to do in a difficult situation."
          : "That's outside what I can help with. I only help with ASSURED: finding safety tools and helplines, reporting, and guidance for common situations."
      ),
    ],
    suggestions: chips,
  };
}

/* ───────────── public API ───────────── */

export interface RespondOptions {
  /** Optional AI classifier. Omit it and Mewvi runs fully on local rules. */
  nlu?: NluFn;
}

function unique(xs: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(x);
    }
    if (out.length >= max) break;
  }
  return out;
}

export async function respond(input: RespondInput, opts: RespondOptions = {}): Promise<MewviReply> {
  const message = sanitizeMessage(typeof input.message === "string" ? input.message : "");
  const ctx = pageContext(input.pathname);
  const local = classify(message, ctx.domain);

  let nlu: Nlu = local;
  let engine: MewviReply["engine"] = "local";
  let ai: AiStatus = opts.nlu ? "skipped" : "off";

  // Danger is decided locally, always. A model is only consulted for vague, non-critical messages.
  if (!local.danger && local.confidence < AI_THRESHOLD && opts.nlu) {
    let out: Awaited<ReturnType<NluFn>>;
    try {
      out = await opts.nlu(message, ctx.pathname);
    } catch {
      out = { ok: false, reason: "unavailable" };
    }
    if (out.ok) {
      nlu = { intent: out.nlu.intent, topic: out.nlu.topic ?? local.topic, target: out.nlu.target, wantsCall: out.nlu.wantsCall ?? local.wantsCall };
      engine = "gemini";
      ai = "ok";
    } else {
      ai = out.reason;
    }
  }

  const parts = compose(message, ctx, nlu, local, Boolean(input.activeJourney));
  const draft: MewviReply = {
    intent: nlu.intent,
    engine,
    ai,
    urgent: parts.urgent,
    blocks: parts.blocks,
    confirmations: (parts.confirmations ?? []).slice(0, 2),
    suggestions: unique(parts.suggestions ?? contextSuggestions(ctx.domain), 3),
  };
  return verifyReply(draft).reply;
}
