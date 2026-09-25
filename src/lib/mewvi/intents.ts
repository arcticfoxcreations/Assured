// src/lib/mewvi/intents.ts
//
// Deterministic understanding. This is Mewvi's ground truth: it works with no
// network and no AI key. When a Gemini key exists it may be consulted for
// vague messages, but danger detection ALWAYS runs here first and can never
// be downgraded by a model.
import type { Domain } from "./context";
import { contextBoost } from "./context";
import { normalize } from "./text";
import type { IntentId, Nlu, TopicId } from "./types";

export type DangerKind = "danger" | "self-harm";

export interface Classification extends Nlu {
  confidence: number;
  danger?: DangerKind;
  scores: Partial<Record<IntentId, number>>;
}

/* ───────────── 1. danger first ───────────── */

const SELF_HARM =
  /\b(suicid\w*|kill myself|end my life|end it all|want to die|wanna die|hurt myself|harm myself|self ?harm\w*|no reason to live|don'?t want to live|can'?t go on)\b/;

const STRONG_DANGER: RegExp[] = [
  // "help me" is danger unless it is clearly a request for help *using the app*.
  /\b(?:help me|save me|help help)\b(?! (?:to )?(?:find|use|with|understand|report|file|choose|pick|learn|know|figure|set|start|track|organi[sz]e|check|write|create|navigate|locate|open|call|contact)\b)/,
  /^(help|helpp+|sos|emergency|urgent|police)$/,
  /\bi(?:'m| am| feel)? (?:in (?:serious |real )?danger|not safe|being (?:attacked|assaulted|kidnapped|held|beaten|chased|threatened)|about to be (?:attacked|hurt))\b/,
  /\bbeing (?:attacked|assaulted|raped|molested|kidnapped|abducted|beaten)\b/,
  /\b(attack(?:ed|ing)? me|assault(?:ed|ing)? me|kidnap\w*|abduct\w*|molest\w*|raping|acid attack)\b/,
  /\b(has|have|with|holding|pulled|showed|showing) (?:a |an )?(?:knife|gun|weapon|blade|pistol|rod)\b/,
  /\b(?:going to|gonna|will|wants? to|threat\w* to) (?:kill|murder|hurt|beat|harm|rape)\b/,
  /\b(?:break(?:ing)? in(?:to)?|broke into|intruder)\b/,
  /\b(?:hitting|beating|choking|strangling|slapping) me\b/,
  /\b(?:medical emergency|heart attack|unconscious|not breathing|overdos\w*|bleeding (?:heavily|badly)|severely injured|serious accident)\b/,
  /\bsomeone (?:is|are) (?:trying to|about to) (?:hurt|kill|grab|take) me\b/,
];
// Personal pleas are always treated as danger.
const PLEA = /\b(urgent help|need urgent help|in trouble|need help now|help now|need help urgently)\b/;
// A bare "emergency"/"sos" may just be someone looking for the emergency number.
const WEAK_DANGER = /\b(emergency|sos)\b/;
const INFO_ASK =
  /\b(what(?:'s| is)|which|list|numbers?|helplines?|how (?:do|can) i (?:call|dial|contact|reach)|tell me|where (?:is|are|can)|find)\b/;
// Explicit time markers only. "was/were" is too ambiguous ("he was hitting me").
const PAST = /\b(last (?:year|month|week|night)|yesterday|ago|years?|months?|weeks?|earlier|previously|happened)\b/;
const PRESENT = /\b(now|right now|currently|still|at this moment|as we speak|happening)\b/;

const MEDICAL = /\b(medical emergency|heart attack|unconscious|not breathing|overdos\w*|bleeding|injured|accident)\b/;
export const isMedical = (n: string) => MEDICAL.test(n);

export function detectDanger(n: string): DangerKind | undefined {
  if (SELF_HARM.test(n)) return "self-harm";
  const pastOnly = PAST.test(n) && !PRESENT.test(n);
  if (PLEA.test(n)) return "danger";
  if (STRONG_DANGER.some((r) => r.test(n)) && !pastOnly) return "danger";
  if (WEAK_DANGER.test(n) && !INFO_ASK.test(n)) return "danger";
  return undefined;
}

/* ───────────── 2. scored rules ───────────── */

interface Rule {
  intent: IntentId;
  strong?: RegExp[];
  weak?: RegExp[];
  not?: RegExp[];
}

const ONLINE_NOUN =
  "online|instagram|facebook|whatsapp|snapchat|social media|dms?|twitter|telegram|internet|email|comments?|chat|reddit|youtube";
const ONLINE_VERB = "threat\\w*|harass\\w*|abus\\w*|blackmail\\w*|bull(?:y|ied|ying)|troll\\w*|stalk\\w*|sextort\\w*|insult\\w*";
const MONEY = "upi|paytm|gpay|google pay|phonepe|bank|card|otp|money|payment|transaction|rupees|account|loan|investment|crypto|wallet|kyc";
const TRANSPORT = "cab|taxi|uber|ola|rapido|auto|rickshaw|bus|train|metro|driver|ride|carpool|vehicle|car";
const FEAR = "unsafe|scared|uncomfortable|creepy|threatened|threatening|nervous|afraid|suspicious|drunk|wrong route|different route|won'?t stop|not stopping|locked";

const RULES: Rule[] = [
  {
    intent: "flow_followed",
    strong: [
      /\b(following me|followed me|is following|are following|being followed|being chased|chasing me|being tailed|following us|keeps following|someone behind me)\b/,
      /\b(follow(?:ing|ed)?|stalk\w*|tail(?:ing|ed)?|chas(?:e|ing|ed)) (?:me|us|my (?:car|cab|bike|auto))\b/,
    ],
    weak: [/\b(stalker|man behind|men behind|suspicious (?:man|men|person|people|guy|guys))\b/],
    not: [new RegExp(`\\b(${ONLINE_NOUN}|account|profile)\\b`), /\b(report|complaint|complain)\b/],
  },
  {
    intent: "flow_unsafe_transport",
    strong: [new RegExp(`\\b(${FEAR})\\b.*\\b(${TRANSPORT})\\b`), new RegExp(`\\b(${TRANSPORT})\\b.*\\b(${FEAR})\\b`)],
    weak: [/\b(cab|taxi|uber|rapido|rickshaw|cab driver)\b/, /\b(unsafe transport|public transport safety)\b/],
  },
  {
    intent: "flow_online_harassment",
    strong: [
      new RegExp(`\\b(${ONLINE_VERB})\\b.*\\b(${ONLINE_NOUN}|photos?|pictures?|videos?)\\b`),
      new RegExp(`\\b(${ONLINE_NOUN})\\b.*\\b(${ONLINE_VERB})\\b`),
      /\b(cyber ?bull\w*|cyber ?stalk\w*|cyber ?harass\w*|sextortion|revenge porn|deepfake|nude (?:photos?|pictures?|videos?)|intimate (?:photos?|images?|videos?))\b/,
      /\b(leak\w*|morph\w*) (?:my |her |his )?(?:photos?|pictures?|videos?|images?)\b/,
    ],
    weak: [/\b(harass\w*|blackmail\w*|troll\w*)\b/],
  },
  {
    intent: "flow_financial_fraud",
    strong: [
      new RegExp(`\\b(scam\\w*|fraud\\w*|cheat\\w*|duped?|swindl\\w*|conned|phish\\w*|stole\\w*|stolen|fake)\\b.*\\b(${MONEY})\\b`),
      new RegExp(`\\b(${MONEY})\\b.*\\b(scam\\w*|fraud\\w*|cheat\\w*|stole\\w*|stolen|fake|phish\\w*|deducted|debited|withdrawn|missing|gone)\\b`),
      /\b(financial fraud|online fraud|cyber fraud|banking fraud|upi fraud|card fraud|online scam|scammed|got scammed|been scammed|phishing)\b/,
      /\b(money|amount|rs|rupees) (?:was |got |has been |is )?(?:deducted|debited|withdrawn|stolen|taken|transferred|gone|missing)\b/,
      /\bunauthori[sz]ed (?:transaction|payment|debit|withdrawal)s?\b/,
      /\b(shared|gave|told|sent|entered|revealed) (?:my |the |an? )?(?:otp|pin|cvv|password|card details|bank details|upi pin)\b/,
      /\b(paid|transferred|sent) (?:the |some )?(?:money|rupees|an? amount)\b.*\b(scam\w*|fraud\w*|fake)\b/,
    ],
    weak: [/\b(scam\w*|fraud\w*|cheated|duped|phishing)\b/],
  },
  {
    intent: "flow_hacked_account",
    strong: [
      /\b(hack\w*|compromis\w*|breach\w*|taken over|took over|hijack\w*)\b/,
      /\b(can'?t (?:log ?in|sign ?in|access)|locked out of|password (?:changed|not working)|someone (?:logged|is logged|logging|using|accessed|accessing) (?:in|into|my))\b/,
      /\bunknown (?:login|log in|sign in|device)s?\b/,
    ],
    weak: [/\b(password|two ?factor|2fa|login)\b/],
  },
  {
    intent: "flow_lost_phone",
    strong: [
      /\b(lost|stolen|missing|snatched|misplaced|robbed)\b.{0,20}\b(phone|mobile|smartphone|handset|sim|iphone|android)\b/,
      /\b(phone|mobile|smartphone|handset|sim|iphone)\b.{0,20}\b(lost|stolen|missing|snatched|misplaced|gone)\b/,
      /\b(find|locate|block|trace|track) (?:my )?(?:lost|stolen|missing) (?:phone|mobile)\b/,
      /\bimei\b/,
    ],
    weak: [/\b(sim swap|sim blocked)\b/],
  },
  {
    intent: "flow_suspicious_message",
    strong: [
      /\b(suspicious|fake|weird|strange|phishing|spam|fraudulent|scam)\b.{0,25}\b(message|sms|text|email|mail|link|whatsapp|notification|qr ?code|url|website|app)\b/,
      /\b(message|sms|text|email|link|whatsapp|qr ?code)\b.{0,25}\b(suspicious|fake|scam|phishing|spam|fraud|asking for (?:otp|money|my details)|asks? for (?:otp|money))\b/,
      /\b(clicked|opened|tapped) (?:on )?(?:a |the |that )?(?:link|attachment|message)\b/,
      /\b(is|was) (?:this|it) (?:a )?(?:scam|fake|real|genuine|legit|safe)\b/,
      /\b(should i (?:click|open|reply|trust)|is this link safe|check (?:this|a) (?:link|message))\b/,
    ],
    weak: [/\b(link|sms|otp|kyc|lottery|prize|parcel)\b/],
  },
  {
    intent: "flow_scam_call",
    strong: [
      /\b(unknown|unfamiliar|suspicious|spam|scam|fake|fraud\w*|strange|weird)\b.{0,20}\b(calls?|caller|number|phone call)\b/,
      /\b(calls?|caller|called|calling)\b.{0,40}\b(otp|arrest|cbi|police|customs|courier|parcel|kyc|bank|insurance|lottery|prize|tax|trai|rbi|sim|electricity|digital arrest)\b/,
      /\b(digital arrest|video call arrest|arrest warrant|drugs? in (?:a |my )?(?:parcel|courier))\b/,
      /\b(truecaller|spam call|robocall|call from (?:an )?unknown)\b/,
    ],
    weak: [/\b(caller|call)\b/],
  },
  {
    intent: "mental_health",
    strong: [
      /\b(depress\w*|anxiet\w*|anxious|panic attacks?|mental health|counsel(?:ling|ing|or)|therap\w*|feeling (?:hopeless|worthless|low|overwhelmed)|can'?t cope|stressed out|burn(?:t|ed) out|lonely|traumat\w*|trauma|tele ?manas)\b/,
    ],
    weak: [/\b(stress\w*|sad|crying|upset)\b/],
  },
  {
    intent: "share_location",
    strong: [
      /\b(share|send|give|show|tell)\b.{0,25}\b(location|live location|position|where i am|my whereabouts)\b/,
      /\blocation (?:sharing|share|link)\b/,
      /\bshare (?:my )?(?:live )?location\b/,
      /\b(send|share) (?:my )?(?:gps|coordinates)\b/,
    ],
    weak: [/\blocation\b/],
  },
  {
    intent: "start_checkin",
    strong: [
      /\bcheck(?:ing|ed)? ?in\b/,
      /\b(start|begin|set up|setup|create) (?:a |my )?(?:journey|trip|safety timer|arrival timer|safe arrival|timer)\b/,
      /\b(tell|let) (?:someone|my (?:friend|family|mom|dad)) (?:know )?(?:when|that) i (?:reach|arrive|get home|am safe)\b/,
      /\bsafe arrival\b/,
    ],
    weak: [/\b(journey|trip|timer|arrive|arrival|reach home|getting home|travelling|traveling|going home)\b/],
  },
  {
    intent: "track_me",
    strong: [
      /\b(friend|family|parents?|mom|mum|dad|mother|father|husband|wife|brother|sister|guardian|relative|boyfriend|girlfriend|partner)\b.{0,30}\b(track|tracking|see|watch|monitor|know where|check on|keep an eye)\b/,
      /\b(track|tracking|monitor|watch)\b.{0,15}\b(me|my (?:journey|trip|ride|location|travel|progress))\b/,
      /\b(live tracking|guardian (?:view|link|mode)|travel guardian)\b/,
    ],
    weak: [/\bguardian\b/],
  },
  {
    intent: "safe_routes",
    strong: [
      /\b(safe|safest|safer|secure) (?:route|routes|way|path|road)\b/,
      /\broutes?\b.{0,20}\b(safe|safety|compare|options?)\b/,
      /\b(which|best) (?:route|way|road) (?:is|to)\b/,
      /\b(route|routes) (?:comparison|planner|planning)\b/,
      /\b(fastest|shortest) (?:route|way)\b/,
    ],
    weak: [/\broutes?\b/, /\bdirections?\b/, /\bnavigate\b/],
  },
  {
    intent: "find_nearby_help",
    strong: [
      /\b(nearest|nearby|near me|closest|around me|near here|close to me)\b.{0,30}\b(police|hospital|clinic|fire station|police station|help|ambulance|safe place|shelter|pharmacy|chemist|medical store|petrol(?: pump)?|fuel station|gas station|atm|cash machine)\b/,
      /\b(police station|hospital|fire station|safe place|shelter|pharmacy|chemist|petrol pump|fuel station|atm)\b.{0,25}\b(nearest|nearby|near me|closest|around me|near here)\b/,
      /\bwhere (?:is|are|can i find) (?:the )?(?:nearest|nearby|closest) \w+/,
      /\bfind (?:me )?(?:nearby |nearest )?(?:help|police|hospital|pharmacy|petrol|fuel|atm)\b/,
    ],
    weak: [/\b(nearby|nearest|near me)\b/],
  },
  {
    intent: "safety_map",
    strong: [
      /\b(safety map|crime map|unsafe areas?|safe areas?|area safety|is this area safe|neighbou?rhood safety|how safe is)\b/,
      /\bmap\b.{0,20}\b(safe|safety|unsafe|reports?|areas?)\b/,
    ],
    weak: [/\b(map|area)\b/],
  },
  {
    intent: "community_report",
    strong: [
      /\b(community (?:report|reports|post|posts|observation)|poor(?:ly)? lit|no street ?lights?|street ?lights?)\b/,
      /\b(?:report|mark|flag|pin|add) (?:an? )?(?:unsafe|dangerous|dark|broken|suspicious) (?:place|area|street|spot|location|road)\b/,
    ],
    weak: [/\bcommunity\b/],
  },
  {
    intent: "report",
    strong: [
      /\b(report|reporting|complain\w*|lodge|file (?:a |an |my )?(?:complaint|fir|case|report)|register (?:a |an )?(?:complaint|fir|case)|fir|police complaint|cyber complaint)\b/,
      /\b(where|how) (?:do|can|should) i (?:report|complain|file)\b/,
      /\b(was|were|got|been) (?:attacked|assaulted|raped|molested|kidnapped|abducted|harassed|stalked|groped|threatened)\b/,
    ],
    weak: [/\b(incident|harass\w*|stalk\w*|assault\w*|molest\w*|abuse\w*|attack\w*|rape\w*)\b/],
  },
  {
    intent: "evidence",
    strong: [
      /\b(evidence|screenshots?|proof|organi[sz]e (?:my )?(?:evidence|documents|files|notes)|incident (?:summary|timeline)|timeline of|keep (?:records?|track of what happened))\b/,
    ],
    weak: [/\b(save|keep|store|records?|timeline|summary)\b/],
  },
  {
    intent: "distress_demo",
    strong: [
      /\b(distress|scream\w*|shout\w*|noise) (?:detection|detect|demo|alert|trigger)\b/,
      /\b(detect|detection of) (?:distress|screaming|shouting|noise)\b/,
      /\b(microphone|mic) (?:demo|test|detection)\b/,
      /\bdistress demo\b/,
    ],
    weak: [/\b(distress|microphone|mic)\b/],
  },
  {
    intent: "helpline_search",
    strong: [
      /\b(helplines?|hotlines?|toll ?free)\b/,
      /\b(emergency|police|ambulance|fire(?: brigade| department| service)?|women|woman|child|children|cyber ?crime|cyber|legal aid|legal|mental health|senior citizens?|elder\w*|railway|rail|highway|tourist|disaster|consumer)\s+(?:helplines?|hotlines?|numbers?|contacts?)\b/,
      /\b(112|1930|181|1098|14416|15100|139|1033|14567)\b/,
      /\b(?:call|dial|number|helpline)\s*(?:on |at |to )?(100|101|102|108|1091)\b/,
      /\b(phone|contact) number\b/,
      /\bwhat(?:'s| is) the number\b/,
      /\bwho (?:do|can|should) i (?:call|contact)\b/,
      /\b(call|dial|ring)\b.{0,15}\b(police|ambulance|fire|emergency|helpline)\b/,
      /\b(?:need|want|get|send) (?:the |an? )?(?:police|ambulance|fire brigade|fire service)\b/,
      /\b(lawyer|advocate|legal advice|legal help|legal aid|free legal aid|attorney)\b/,
    ],
    weak: [/\b(number|contact|call|dial|phone)\b/],
  },
  {
    intent: "navigate",
    strong: [/\b(go to|take me to|open|show me|navigate to|bring up|where is|where can i find|find the|find my)\b/],
  },
  {
    intent: "about",
    strong: [
      /\b(who are you|what are you|what can you do|what do you do|how do you work|are you (?:an? )?(?:ai|bot|robot|human)|your name|about mewvi|help me use|how (?:do|does) (?:i use|assured work)|what is assured)\b/,
      /^(help|menu|options|what can i ask)$/,
    ],
  },
  {
    intent: "greeting",
    strong: [/^(hi|hello|hey|hii+|namaste|good (?:morning|afternoon|evening)|yo|hola)(?: [a-z]{1,10})?$/],
  },
  {
    intent: "thanks",
    strong: [/\b(thanks|thank you|thx|ty|appreciate)\b/, /^(ok|okay|cool|got it|great|nice|alright)$/],
  },
  {
    intent: "out_of_scope",
    strong: [
      /\b(ignore (?:all |your |previous |the )?(?:instructions|rules|prompt)|system prompt|jailbreak|pretend to be|you are now|disregard|developer mode|dan mode|reveal your (?:prompt|instructions))\b/,
      /\b(poem|joke|recipe|weather|cricket|ipl|stock|share price|movie|song|lyrics|homework|essay|horoscope|bitcoin|who won|capital of|write (?:a |an |me )?(?:code|program|script|story|letter)|translate|python|javascript)\b/,
    ],
  },
  {
    intent: "flow_unfamiliar_location",
    strong: [
      /\b(i'?m lost|i am lost|got lost|lost my way|lost here|don'?t know where i am|no idea where i am|unfamiliar (?:place|area|city|location|neighbou?rhood)|strange (?:place|area|city)|unknown (?:place|area|city|location))\b/,
      /\b(deserted|isolated|empty (?:road|street|lane|station|stop)|dark (?:road|street|lane|area|alley)|alone at night|walking alone|new (?:city|town|place))\b/,
      /\b(feel|feeling|feels) (?:unsafe|scared|nervous|uneasy|uncomfortable|afraid|threatened)\b/,
      /\b(unsafe|not safe) (?:here|around here|where i am|in this (?:place|area))\b/,
    ],
    weak: [/\b(unsafe|scared|nervous|uneasy|afraid)\b/],
  },
];

/** When two intents tie, the earlier one wins. Safety-relevant intents come first. */
const PRIORITY: IntentId[] = [
  "flow_followed",
  "flow_unsafe_transport",
  "flow_online_harassment",
  "community_report",
  "report",
  "track_me",
  "share_location",
  "start_checkin",
  "helpline_search",
  "flow_lost_phone",
  "flow_hacked_account",
  "flow_scam_call",
  "flow_suspicious_message",
  "flow_financial_fraud",
  "flow_unfamiliar_location",
  "find_nearby_help",
  "safe_routes",
  "safety_map",
  "evidence",
  "distress_demo",
  "mental_health",
  "navigate",
  "about",
  "greeting",
  "thanks",
  "out_of_scope",
  "emergency_danger",
];

function scoreRule(n: string, r: Rule): number {
  if (r.not?.some((x) => x.test(n))) return 0;
  const strongHits = (r.strong ?? []).filter((x) => x.test(n)).length;
  const weakHits = (r.weak ?? []).filter((x) => x.test(n)).length;
  return 3 * Math.min(2, strongHits) + Math.min(2, weakHits);
}

/* ───────────── 3. topic + target detection ───────────── */

const ONLINE_HARASS_TOPIC = new RegExp(
  `\\b(${ONLINE_VERB})\\b.*\\b(${ONLINE_NOUN})\\b|\\b(${ONLINE_NOUN})\\b.*\\b(${ONLINE_VERB})\\b|\\b(cyber ?bull\\w*|cyber ?stalk\\w*|sextortion|revenge porn|deepfake)\\b`
);

const TOPIC_RULES: [TopicId, RegExp][] = [
  ["mental-health", /\b(mental health|counsel\w*|depress\w*|anxiet\w*|suicid\w*|therap\w*|tele ?manas)\b/],
  ["online-harassment", ONLINE_HARASS_TOPIC],
  ["lost-phone", /\b(lost|stolen|missing|snatched)\b.{0,20}\b(phone|mobile|sim)\b|\b(phone|mobile|sim)\b.{0,20}\b(lost|stolen|missing|snatched)\b|\bimei\b|sanchar ?saathi/],
  ["hacked", /\b(hack\w*|account (?:hacked|compromised))\b/],
  ["financial", /\b(financial|banking|upi|card|bank|money|payment|transaction|loan|investment|crypto|otp|kyc|scam\w*|fraud\w*|cheated|duped|phish\w*)\b/],
  ["workplace", /\b(workplace|office|boss|colleague|manager|posh|she ?box|internal committee)\b/],
  ["child", /\b(child|children|kid|kids|minor|baby|toddler|my (?:son|daughter)|school|student|pocso|childline)\b/],
  ["women", /\b(women|woman|girl|girls|wife|lady|ladies|female|harass\w*|stalk\w*|eve ?teas\w*|molest\w*|groped|dowry|domestic (?:violence|abuse)|sexual\w*|catcall\w*|ncw|mission shakti)\b/],
  ["legal", /\b(lawyer|advocate|legal|nalsa|attorney)\b/],
  ["railway", /\b(railway|rail|train|irctc|railmadad|rail madad)\b/],
  ["highway", /\b(highway|nhai|expressway|toll)\b/],
  ["senior", /\b(senior|elder\w*|old age|aged parents?)\b/],
  ["consumer", /\bconsumer\b/],
  ["disaster", /\b(disaster|flood|earthquake|cyclone|landslide|ndma)\b/],
  ["tourist", /\b(tourist|tourism)\b/],
  ["ambulance", /\b(ambulance|medical|hospital|injur\w*|doctor)\b/],
  ["fire", /\b(fire|fire brigade)\b/],
  ["police", /\b(police|cops?|thana|crime)\b/],
  ["emergency", /\b(emergency|sos|urgent)\b/],
  ["cyber", /\b(cyber\w*|online|internet|whatsapp|instagram|facebook|email|sms|link|phone call|scam call)\b/],
];

export function detectTopic(n: string): TopicId | undefined {
  for (const [topic, re] of TOPIC_RULES) if (re.test(n)) return topic;
  return undefined;
}

// Specific pages first; generic ones last.
const NAV_SYNONYMS: [string, RegExp][] = [
  ["helplines-national", /\bnational helplines?\b/],
  ["helplines-states", /\b(state helplines?|state ?wise|states? and union territories)\b/],
  ["report-cyber", /\breport (?:cyber\w*|online)\b/],
  ["report-women", /\breport (?:women|harassment|stalking)\b/],
  ["report-financial-fraud", /\breport (?:financial|fraud)\b/],
  ["cyber-scam-call", /\b(scam call|scam message|unknown call|suspicious call|call checker)\b/],
  ["safety-distress-demo", /\bdistress\b/],
  ["travel-routes", /\b(safe routes?|routes?)\b/],
  ["travel-check-in", /\bcheck ?in\b/],
  ["travel-guardian", /\btravel guardian\b/],
  ["location-share", /\b(share location|location share|share my location)\b/],
  ["safety-map-area", /\b(area safety|safety of (?:an |the )?area)\b/],
  ["safety-map", /\bsafety map\b/],
  ["guardian", /\bguardian( view| link)?\b/],
  ["evidence", /\bevidence\b/],
  ["community", /\bcommunity\b/],
  ["resources", /\bresources?\b/],
  ["helplines", /\b(helplines?|directory)\b/],
  ["cyber", /\bcyber( safety)?\b/],
  ["women", /\bwomen'?s?( safety)?\b/],
  ["children", /\b(child(?:ren)?(?:'s)?(?: safety)?|kids?)\b/],
  ["emergency", /\b(emergency|sos)\b/],
  ["travel", /\b(travel|trip|journey)\b/],
  ["settings", /\b(settings?|theme|dark mode|preferences?)\b/],
  ["report", /\breport(?:ing)?\b/],
  ["home", /\b(home|home ?page|main page)\b/],
];

export function resolveTarget(n: string): string | undefined {
  for (const [id, re] of NAV_SYNONYMS) if (re.test(n)) return id;
  return undefined;
}

export const wantsCall = (n: string) => /\b(call|dial|phone|ring)\b/.test(n);

/* ───────────── 4. classify ───────────── */

export function classify(text: string, domain: Domain): Classification {
  const n = normalize(text);
  if (!n) return { intent: "greeting", confidence: 1, scores: {} };

  const danger = detectDanger(n);
  if (danger === "self-harm") {
    return { intent: "mental_health", topic: "mental-health", confidence: 1, danger, scores: {}, wantsCall: wantsCall(n) };
  }
  if (danger === "danger") {
    return { intent: "emergency_danger", topic: "emergency", confidence: 1, danger, scores: {} };
  }

  const boost = contextBoost(domain);
  const scores: Partial<Record<IntentId, number>> = {};
  for (const r of RULES) {
    const s = scoreRule(n, r);
    if (s > 0) scores[r.intent] = Math.max(scores[r.intent] ?? 0, s) + (boost[r.intent] ?? 0);
  }

  const ranked = (Object.keys(scores) as IntentId[]).sort((a, b) => {
    const d = (scores[b] ?? 0) - (scores[a] ?? 0);
    return d !== 0 ? d : PRIORITY.indexOf(a) - PRIORITY.indexOf(b);
  });

  if (ranked.length === 0) {
    // Something alarming was said in the past tense and no rule matched: reporting help beats "I can't help".
    if (STRONG_DANGER.some((r) => r.test(n))) return { intent: "report", topic: detectTopic(n), confidence: 0.5, scores };
    return { intent: "out_of_scope", confidence: 0.3, scores };
  }

  const top = ranked[0];
  const topScore = scores[top] ?? 0;
  const second = scores[ranked[1]] ?? 0;
  let confidence = topScore >= 6 ? 0.95 : topScore >= 4 ? 0.85 : topScore >= 3 ? 0.78 : topScore >= 2 ? 0.55 : 0.35;
  if (topScore - second < 1 && ranked.length > 1) confidence -= 0.2;

  return {
    intent: top,
    topic: detectTopic(n),
    target: top === "navigate" ? resolveTarget(n) : undefined,
    wantsCall: wantsCall(n),
    confidence: Math.max(0, confidence),
    scores,
  };
}

/** Confidence below this is worth asking an optional AI classifier about. */
export const AI_THRESHOLD = 0.75;
