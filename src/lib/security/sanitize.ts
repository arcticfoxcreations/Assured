// src/lib/security/sanitize.ts
//
// Minimal, dependency-free helpers for handling user-provided text safely.
// These are foundations only — Part 2+ should route all form submissions
// through zod schemas in addition to this.

/** Strips characters that could be used for HTML/script injection. */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/** Collapses whitespace and trims, for consistent storage/display. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Caps a string to a maximum length without cutting mid-word where avoidable. */
export function capLength(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max).trim() + "…";
}

/** Basic safe-text pipeline for any free-text field a user submits. */
export function sanitizeUserText(input: string, maxLength = 2000): string {
  return capLength(normalizeWhitespace(stripHtml(input)), maxLength);
}
