// src/lib/mewvi/guard.ts
//
// The last line of defence against invented facts. Every reply passes through
// here before it is returned. Anything a person could act on — a phone
// number, an email, a website, a link, a call button — must match ASSURED's
// verified data or it is removed. This runs even though replies are already
// built from templates and the dataset: defence in depth, and it's what makes
// the "Mewvi never invents contact details" claim testable.
import { helplineById, internalPaths, toRef, verifiedEmails, verifiedHosts, verifiedNumbers } from "./catalog";
import type { Block, Confirmation, LinkRef, MewviReply, PathStep } from "./types";

export const REMOVED = "[unverified detail removed]";

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const HOST = /\b(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:gov\.in|nic\.in|gov|in|com|org|net|co|info|io|app|me))\b(?:\/[^\s)]*)?/gi;
const PHONE = /\b\d{3,}(?:[\s-]\d{2,})*\b/g;

const hostAllowed = (host: string, allowed: Set<string>) => {
  const h = host.replace(/^www\./, "").toLowerCase();
  for (const a of allowed) if (h === a || h.endsWith(`.${a}`)) return true;
  return false;
};

/** Scrub one string. Pushes a note into `issues` for everything removed. */
export function scrubText(input: string, issues: string[] = []): string {
  const emails = verifiedEmails();
  const hosts = verifiedHosts();
  const numbers = verifiedNumbers();

  let out = input.replace(EMAIL, (m) => {
    if (emails.has(m.toLowerCase())) return m;
    issues.push(`email:${m}`);
    return REMOVED;
  });
  out = out.replace(HOST, (m, host: string) => {
    if (hostAllowed(host, hosts)) return m;
    issues.push(`url:${m}`);
    return REMOVED;
  });
  out = out.replace(PHONE, (m) => {
    if (numbers.has(m.replace(/[^0-9]/g, ""))) return m;
    issues.push(`number:${m}`);
    return REMOVED;
  });
  return out;
}

function hrefOk(href: string | undefined, issues: string[]): boolean {
  if (!href) return false;
  if (href.startsWith("/")) {
    const ok = internalPaths().has(href.split("?")[0]);
    if (!ok) issues.push(`route:${href}`);
    return ok;
  }
  try {
    const u = new URL(href);
    const ok = u.protocol === "https:" && hostAllowed(u.hostname, verifiedHosts());
    if (!ok) issues.push(`link:${href}`);
    return ok;
  } catch {
    issues.push(`link:${href}`);
    return false;
  }
}

function guardLink(l: LinkRef, issues: string[]): LinkRef | undefined {
  if (!hrefOk(l.href, issues)) return undefined;
  return { ...l, label: scrubText(l.label, issues), description: l.description ? scrubText(l.description, issues) : undefined };
}

function guardStep(s: PathStep, issues: string[]): PathStep {
  const step: PathStep = { ...s, label: scrubText(s.label, issues), note: s.note ? scrubText(s.note, issues) : undefined };
  if (s.href && !hrefOk(s.href, issues)) {
    delete step.href;
    step.external = false;
  }
  return step;
}

function guardBlock(b: Block, issues: string[]): Block | undefined {
  switch (b.type) {
    case "text":
      return { ...b, text: scrubText(b.text, issues) };
    case "notice":
      return { ...b, text: scrubText(b.text, issues) };
    case "steps":
      return { ...b, title: b.title ? scrubText(b.title, issues) : undefined, steps: b.steps.map((s) => scrubText(s, issues)) };
    case "helplines": {
      // Re-hydrate from the dataset: whatever the reply claimed, the card shows the verified record.
      const items = b.items.flatMap((i) => {
        const h = helplineById(i.id);
        if (!h) {
          issues.push(`helpline:${i.id}`);
          return [];
        }
        return [toRef(h)];
      });
      return items.length ? { ...b, items } : undefined;
    }
    case "links": {
      const items = b.items.map((l) => guardLink(l, issues)).filter((l): l is LinkRef => Boolean(l));
      return items.length ? { ...b, items } : undefined;
    }
    case "path":
      return { ...b, title: scrubText(b.title, issues), steps: b.steps.map((s) => guardStep(s, issues)) };
  }
}

function guardConfirmation(c: Confirmation, issues: string[]): Confirmation | undefined {
  if (c.href.startsWith("tel:")) {
    const digits = c.href.slice(4).replace(/[^0-9]/g, "");
    if (!verifiedNumbers().has(digits)) {
      issues.push(`call:${c.href}`);
      return undefined;
    }
  } else if (!hrefOk(c.href, issues) || !c.href.startsWith("/")) {
    return undefined;
  }
  return { ...c, prompt: scrubText(c.prompt, issues), detail: c.detail ? scrubText(c.detail, issues) : undefined };
}

export function verifyReply(reply: MewviReply): { reply: MewviReply; issues: string[] } {
  const issues: string[] = [];
  const blocks = reply.blocks.map((b) => guardBlock(b, issues)).filter((b): b is Block => Boolean(b));
  const confirmations = reply.confirmations.map((c) => guardConfirmation(c, issues)).filter((c): c is Confirmation => Boolean(c));
  const suggestions = reply.suggestions.map((s) => scrubText(s, issues));
  return { reply: { ...reply, blocks, confirmations, suggestions }, issues };
}
