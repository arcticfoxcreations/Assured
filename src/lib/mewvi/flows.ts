// src/lib/mewvi/flows.ts
//
// Concise safety-guidance flows. Deliberately short (never more than four
// steps) so a frightened person isn't handed a wall of text. Phone numbers and
// official links are NOT written here — they are attached from the verified
// dataset at reply time. The only digits that appear in step text are 112 and
// 1930, and both are checked by the hallucination guard.
import type { IntentId, TopicId } from "./types";

export interface Flow {
  title: string;
  lead: string;
  /** Immediate-danger flows lead with emergency services. */
  urgent?: boolean;
  steps: string[];
  helplineIds: string[];
  links: { routeId: string; suffix?: string; label?: string }[];
  /** Attaches the guided report path (Cyber Safety → … → Evidence → Report). */
  reportTopic?: TopicId;
  offerCall112?: boolean;
  offerShare?: boolean;
  suggestions: string[];
}

export const DISCLAIMER =
  "Mewvi is a guide to ASSURED. It is not police, medical care, legal representation or emergency response.";

export const EMERGENCY_FLOW: Flow = {
  title: "If you are in immediate danger",
  lead: "This sounds urgent — your safety comes first.",
  urgent: true,
  steps: [
    "Call 112 now and say where you are and what is happening.",
    "If it is safe to move, head toward a well-lit, public place with other people — a shop, petrol pump, hospital or police post.",
    "Tell someone you trust where you are. ASSURED can help you share your location.",
  ],
  helplineIds: ["erss-112"],
  links: [],
  offerCall112: true,
  offerShare: true,
  suggestions: ["How do I share my location?", "Show nearby help", "I'm safe now, what can you do?"],
};

export const MEDICAL_FLOW: Flow = {
  title: "If someone needs medical help",
  lead: "This sounds like a medical emergency.",
  urgent: true,
  steps: [
    "Call 112 now and ask for an ambulance. Stay on the line and follow what the operator tells you.",
    "If someone is with you, ask them to stay and help.",
    "Tell them exactly where you are — landmark, road name or building.",
  ],
  helplineIds: ["erss-112"],
  links: [],
  offerCall112: true,
  offerShare: true,
  suggestions: ["How do I share my location?", "Show nearby help"],
};

export const FLOWS: Partial<Record<IntentId, Flow>> = {
  flow_followed: {
    title: "If you are being followed",
    lead: "That sounds frightening. Here is what usually helps most.",
    urgent: true,
    steps: [
      "Don't go home or into an empty place. Head toward a busy, well-lit public place — a shop, restaurant, petrol pump, hospital or crowded stop.",
      "Call or message someone you trust and stay on the phone with them. Tell them where you are.",
      "Don't confront the person. If it is safe, note a description — but getting to safety matters more.",
      "If you feel in danger at any point, call 112.",
    ],
    helplineIds: ["erss-112"],
    links: [{ routeId: "travel-check-in" }],
    offerCall112: true,
    offerShare: true,
    suggestions: ["How do I share my location?", "Show nearby help", "I need the women helpline"],
  },

  flow_unsafe_transport: {
    title: "If you feel unsafe in a cab, auto or public transport",
    lead: "Trust that feeling. A few quiet steps can help.",
    urgent: true,
    steps: [
      "If you can, ask to stop somewhere busy and well-lit — a petrol pump, shop or crowded junction — and get out there.",
      "Share your live location with someone you trust now, and tell them you are uncomfortable. A message is enough.",
      "Let the driver know someone is tracking the ride. Keep your phone charged and in your hand.",
      "If you feel in danger, call 112.",
    ],
    helplineIds: ["erss-112"],
    links: [{ routeId: "travel-guardian" }, { routeId: "travel-check-in" }],
    offerCall112: true,
    offerShare: true,
    suggestions: ["How can my friend track me?", "Show nearby help"],
  },

  flow_unfamiliar_location: {
    title: "If you feel unsafe or are somewhere unfamiliar",
    lead: "Let's get you somewhere comfortable and keep someone in the loop.",
    steps: [
      "Stay calm and move toward a busy, well-lit place — a shop, hotel lobby, petrol pump or hospital — rather than wandering.",
      "Share your location with someone you trust so they can guide you or come to you.",
      "Ask staff at a shop or hotel for directions rather than a stranger on the street.",
      "If you feel threatened, call 112.",
    ],
    helplineIds: [],
    links: [{ routeId: "safety-map-area" }, { routeId: "travel-routes" }],
    offerShare: true,
    suggestions: ["Show nearby help", "Find the safest route", "Someone is following me"],
  },

  flow_online_harassment: {
    title: "If someone is harassing or threatening you online",
    lead: "I'm sorry this is happening. You don't have to deal with it alone.",
    steps: [
      "Don't reply or negotiate. Don't delete anything.",
      "Save evidence first: screenshots that show the profile name, username, date, time and the page address.",
      "Then block and report the account on the platform, and tighten your privacy settings.",
      "Report to the cybercrime portal. If you feel physically unsafe, call 112.",
    ],
    helplineIds: ["ncrp-portal", "cybercrime-1930"],
    links: [{ routeId: "evidence", suffix: "?category=online-harassment" }],
    reportTopic: "online-harassment",
    suggestions: ["What evidence should I keep?", "Where do I report an online threat?"],
  },

  flow_financial_fraud: {
    title: "If you've been scammed or money has gone",
    lead: "I'm sorry — act quickly, because speed can matter for getting money frozen.",
    steps: [
      "If money was just moved, call 1930 immediately.",
      "Call your bank using the number on your card or in your bank app — not a number from a message — and ask to block the card, UPI or account.",
      "Don't delete messages, SMS or call logs. Screenshot transaction IDs, UPI references and the scammer's number, ID or link.",
      "File a complaint on the National Cyber Crime Reporting Portal.",
    ],
    helplineIds: ["cybercrime-1930", "ncrp-portal"],
    links: [{ routeId: "evidence", suffix: "?category=financial-fraud" }],
    suggestions: ["What evidence should I keep?", "Where do I report financial fraud?", "I got a suspicious call"],
  },

  flow_hacked_account: {
    title: "If an account has been hacked",
    lead: "Let's lock it down. Do these in order.",
    steps: [
      "Reset the password from the official app or website — not from a link in a message.",
      "Turn on two-step verification and sign out of all other devices.",
      "Change the password on any other account that reused it, especially email and banking.",
      "Warn your contacts not to click links or send money. If money or a bank account is involved, call 1930. If the phone itself may be affected, turn off its Wi-Fi and mobile data until you've checked it.",
    ],
    helplineIds: ["cybercrime-1930", "ncrp-portal"],
    links: [{ routeId: "evidence", suffix: "?category=hacked-account" }],
    suggestions: ["What evidence should I keep?", "Where do I report a hacked account?"],
  },

  flow_lost_phone: {
    title: "If your phone is lost or stolen",
    lead: "Do these quickly — the first hour matters most.",
    steps: [
      "Call your own number from another phone in case it's simply nearby.",
      "Use your phone's built-in find-my-device tool from another device to locate, lock or erase it.",
      "Contact your mobile operator to block the SIM, and call your bank (number from your card or app) to protect UPI and banking apps.",
      "Use Sanchar Saathi to block or trace the phone, and file a police complaint if it was stolen.",
    ],
    helplineIds: ["sancharsaathi"],
    links: [{ routeId: "evidence", suffix: "?category=lost-phone" }],
    suggestions: ["Where do I report a lost phone?", "What evidence should I keep?"],
  },

  flow_suspicious_message: {
    title: "If you got a suspicious message or link",
    lead: "Good instinct to check first.",
    steps: [
      "Don't click links, open attachments, reply, or call numbers in the message.",
      "Never share an OTP, PIN, CVV or password. No genuine bank or agency asks for these.",
      "Check the sender separately, using the number or website on your card, bill or official app.",
      "Screenshot the message before deleting it. If you already clicked or shared something, change passwords, call your bank and call 1930.",
    ],
    helplineIds: ["cybercrime-1930"],
    links: [{ routeId: "cyber-scam-call" }, { routeId: "report-cyber" }],
    suggestions: ["I already shared my OTP", "Where do I report a scam message?"],
  },

  flow_scam_call: {
    title: "If you got a suspicious call",
    lead: "Browsers can't see or block phone calls, but here is what to do.",
    steps: [
      "Hang up. You don't have to stay on the line or explain yourself.",
      "Never share an OTP, PIN, CVV or bank details, and don't install any app the caller asks for.",
      "Police and government agencies don't ask you to stay on a video call or move money to prove your innocence.",
      "If you already paid or shared details, call 1930 immediately.",
    ],
    helplineIds: ["cybercrime-1930", "ncrp-portal"],
    links: [{ routeId: "cyber-scam-call" }, { routeId: "evidence", suffix: "?category=scam-call" }],
    suggestions: ["I already shared my OTP", "Where do I report financial fraud?"],
  },
};

export const MENTAL_HEALTH_FLOW: Flow = {
  title: "Support is available",
  lead: "I'm really sorry you're going through this. You don't have to handle it alone.",
  steps: [
    "If you might act on thoughts of harming yourself, or you're in immediate danger, call 112 now.",
    "If someone you trust is nearby, tell them how you're feeling right now.",
    "Tele MANAS offers free, confidential support at any hour.",
  ],
  helplineIds: ["telemanas"],
  links: [],
  suggestions: ["I need the police", "Find a helpline"],
};

export const SELF_HARM_FLOW: Flow = {
  ...MENTAL_HEALTH_FLOW,
  urgent: true,
  lead: "I'm really glad you told me. Your life matters, and you don't have to face this alone.",
  helplineIds: ["telemanas", "erss-112"],
  offerCall112: true,
  suggestions: ["Find a helpline"],
};
