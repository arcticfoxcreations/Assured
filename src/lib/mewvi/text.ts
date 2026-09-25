// src/lib/mewvi/text.ts — text hygiene for Mewvi. Isomorphic.
import { sanitizeUserText } from "@/lib/security/sanitize";

export const MAX_MESSAGE = 500;

/** Clean user text before anything else sees it. */
export function sanitizeMessage(input: string, max = MAX_MESSAGE): string {
  // eslint-disable-next-line no-control-regex
  const noControl = input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ");
  return sanitizeUserText(noControl, max);
}

/** Lower-case, punctuation-light form used for matching. Keeps apostrophes. */
export function normalize(input: string): string {
  return input
    .toLowerCase()
    .replace(/[’‘`]/g, "'")
    .replace(/[^a-z0-9'+\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Before any text leaves for an AI model: mask things ASSURED never needs the
 * model to see — emails, links, and phone / account-like digit runs.
 */
export function redactForModel(input: string): string {
  return input
    .replace(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, "[email]")
    .replace(/\bhttps?:\/\/\S+/gi, "[link]")
    .replace(/\b(?:www\.)\S+/gi, "[link]")
    .replace(/\+?\d[\d\s-]{5,}\d/g, "[number]");
}
