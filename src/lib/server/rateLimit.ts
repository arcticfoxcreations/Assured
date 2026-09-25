// src/lib/server/rateLimit.ts — best-effort, per-instance limiter. Good
// enough to blunt casual abuse; put a real limiter (e.g. Upstash) in front
// of the API before a large public launch.
const g = globalThis as unknown as { __assuredRl?: Map<string, number[]> };
export function rateLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const m: Map<string, number[]> = (g.__assuredRl ??= new Map<string, number[]>());
  const hits = (m.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) { m.set(key, hits); return false; }
  hits.push(now); m.set(key, hits);
  if (m.size > 5000) m.clear();
  return true;
}
export const clientIp = (req: Request) =>
  req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
