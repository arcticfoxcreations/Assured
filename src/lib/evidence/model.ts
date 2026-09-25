// src/lib/evidence/model.ts — pure. The evidence organizer's data shape and the text it generates.
// Nothing here claims legal admissibility; it only helps the person stay organised.
import { getReportGuide } from "@/lib/reportGuides";

export interface EvidenceEntry {
  id: string;
  /** Local date-time "YYYY-MM-DDTHH:mm" chosen by the person. */
  at: string;
  title: string;
  text: string;
  file?: { name: string; type: string; size: number };
}

export interface EvidenceCase {
  category: string;
  incidentAt: string;
  place: string;
  summary: string;
  people: string;
  entries: EvidenceEntry[];
  checked: string[];
  updatedAt: number;
}

export const CATEGORIES = [
  { id: "online-harassment", label: "Online harassment or threats", guide: "cyber" },
  { id: "financial-fraud", label: "Financial fraud (UPI, card, banking)", guide: "financial-fraud" },
  { id: "hacked-account", label: "Hacked account", guide: "cyber" },
  { id: "lost-phone", label: "Lost or stolen phone", guide: "cyber" },
  { id: "scam-call", label: "Scam call or message", guide: "cyber" },
  { id: "stalking-harassment", label: "Stalking or harassment", guide: "women" },
  { id: "workplace-harassment", label: "Workplace harassment", guide: "women" },
  { id: "other", label: "Something else", guide: "" },
] as const;

export const isCategory = (id: string) => CATEGORIES.some((c) => c.id === id);
export const categoryLabel = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? "Something else";

export const emptyCase = (): EvidenceCase => ({ category: "other", incidentAt: "", place: "", summary: "", people: "", entries: [], checked: [], updatedAt: 0 });

export const nowLocal = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const GENERIC_CHECKLIST = [
  "Date and time of each event",
  "Where it happened",
  "Names or descriptions of the people involved (only what you know)",
  "Screenshots, photos or documents",
  "What you said or did in response",
  "Anyone who witnessed it",
];

/** Checklist items come from ASSURED's verified report guides, so they match the reporting pages. */
export function checklistFor(category: string): string[] {
  const guideId = CATEGORIES.find((c) => c.id === category)?.guide;
  const guide = guideId ? getReportGuide(guideId) : undefined;
  if (!guide) return GENERIC_CHECKLIST;
  return Array.from(new Set([...guide.whatEvidenceToPreserve, ...guide.whatInformationToKeep]));
}

export function sortedEntries(c: EvidenceCase): EvidenceEntry[] {
  return c.entries.map((e, i) => ({ e, i })).sort((a, b) => (a.e.at === b.e.at ? a.i - b.i : a.e.at < b.e.at ? -1 : 1)).map((x) => x.e);
}

const when = (at: string) => (at ? at.replace("T", " ") : "date not set");
const size = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

export function buildTimeline(c: EvidenceCase): string {
  const list = sortedEntries(c);
  if (list.length === 0) return "No timeline entries yet.";
  return list
    .map((e, i) => {
      const parts = [`${i + 1}. ${when(e.at)} — ${e.title || "Untitled entry"}`];
      if (e.text) parts.push(`   ${e.text.replace(/\n+/g, "\n   ")}`);
      if (e.file) parts.push(`   Attachment kept on the person's device: ${e.file.name} (${size(e.file.size)})`);
      return parts.join("\n");
    })
    .join("\n");
}

export function buildChecklist(c: EvidenceCase): string {
  return checklistFor(c.category).map((item) => `[${c.checked.includes(item) ? "x" : " "}] ${item}`).join("\n");
}

export function buildSummary(c: EvidenceCase): string {
  return [
    "INCIDENT SUMMARY",
    "Prepared with the ASSURED Evidence Organizer",
    "",
    `Category: ${categoryLabel(c.category)}`,
    `When: ${when(c.incidentAt)}`,
    `Where: ${c.place || "not provided"}`,
    `People or accounts involved: ${c.people || "not provided"}`,
    "",
    "What happened:",
    c.summary || "Not provided.",
    "",
    "TIMELINE",
    buildTimeline(c),
    "",
    "EVIDENCE CHECKLIST",
    buildChecklist(c),
    "",
    "Note: This was written by the person for their own records. ASSURED has not verified it. It is not legal advice and does not make anything legally admissible.",
  ].join("\n");
}
