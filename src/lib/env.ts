// src/lib/env.ts
//
// Central place to read environment variables. Never read
// process.env directly elsewhere — import from here so it's obvious
// which values are public and which are server-only.

export const publicEnv = {
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? "ASSURED",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
};

/**
 * Server-only environment variables. Importing this file from a
 * "use client" component will fail at build time if any of these are
 * ever accessed on the client, which is the intended safety net.
 */
export const serverEnv = {
  // Read lazily (functions) so values are picked up at request time.
  supabaseUrl: () => process.env.SUPABASE_URL,
  supabaseKey: () => process.env.SUPABASE_SERVICE_ROLE_KEY,
  orsKey: () => process.env.ORS_API_KEY,
  tokenSecret: () => process.env.SHARE_TOKEN_SECRET ?? "",
  geminiKey: () => process.env.GEMINI_API_KEY,
  geminiModel: () => process.env.GEMINI_MODEL || "gemini-2.5-flash",
  onVercel: () => Boolean(process.env.VERCEL),
};
