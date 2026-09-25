// src/lib/travel/moderation.ts
// Community reports must describe a PLACE or SITUATION, never a person.
// These checks are a first filter, not a guarantee — the flag button and
// auto-hide-after-3-flags rule back them up.
const PATTERNS: { re: RegExp; msg: string }[] = [
  { re: /(?:\+?\d[\s-]?){10,}/, msg: "phone numbers" },
  { re: /[\w.+-]+@[\w-]+\.[\w.]+/, msg: "email addresses" },
  { re: /(https?:\/\/|www\.)\S+/i, msg: "links" },
  { re: /\b[A-Z]{2}[\s-]?\d{1,2}[\s-]?[A-Z]{1,3}[\s-]?\d{4}\b/i, msg: "vehicle numbers" },
  { re: /\b(?:aadhaar|aadhar|pan card)\b/i, msg: "identity documents" },
];

export function checkReportText(text: string): { ok: true } | { ok: false; error: string } {
  for (const p of PATTERNS) {
    if (p.re.test(text)) {
      return {
        ok: false,
        error: `Please remove ${p.msg}. Reports should describe a place or situation, not identify a person.`,
      };
    }
  }
  return { ok: true };
}

export const ABUSE_HIDE_THRESHOLD = 3;
export const COORD_DECIMALS = 3; // ≈ 100 m: public pins never mark an exact spot
export const roundCoord = (n: number) => Number(n.toFixed(COORD_DECIMALS));
