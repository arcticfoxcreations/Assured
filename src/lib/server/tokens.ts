// src/lib/server/tokens.ts — server only.
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** 192 bits of randomness, URL-safe. Unguessable — never derived from an ID. */
export const newToken = () => randomBytes(24).toString("base64url");
export const newId = () => randomBytes(9).toString("base64url");

/** Only hashes are stored, so a leaked database can't be used as guardian links. */
export function hashToken(token: string, secret = process.env.SHARE_TOKEN_SECRET ?? ""): string {
  return createHash("sha256").update(`${secret}:${token}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/* Guardian links must be re-sendable in alerts, so the raw token is kept
 * ONLY in sealed (AES-256-GCM) form, keyed by SHARE_TOKEN_SECRET. Without
 * that secret nothing is sealed and alerts go out without the link. */
import { createCipheriv, createDecipheriv } from "node:crypto";
const sealKey = () => {
  const s = process.env.SHARE_TOKEN_SECRET ?? "";
  return s.length >= 16 ? createHash("sha256").update(`seal:${s}`).digest() : null;
};
export function seal(text: string): string | null {
  const key = sealKey();
  if (!key) return null;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64url");
}
export function unseal(blob: string): string | null {
  const key = sealKey();
  if (!key) return null;
  try {
    const b = Buffer.from(blob, "base64url");
    const d = createDecipheriv("aes-256-gcm", key, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return Buffer.concat([d.update(b.subarray(28)), d.final()]).toString("utf8");
  } catch { return null; }
}
