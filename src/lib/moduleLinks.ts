// src/lib/moduleLinks.ts
//
// If ASSURED is ever split into separately deployed modules, each
// module's base URL can be configured here without touching component
// code. Until a variable is set, links stay internal (relative), which
// is exactly right while everything ships as one app.

function resolve(envVar: string | undefined, path: string): string {
  return envVar ? `${envVar.replace(/\/$/, "")}${path}` : path;
}

/** True when a module has been split into its own deployment (its env var is set). */
export const isExternal = (envVar: string | undefined) => Boolean(envVar);

export const moduleLinks = {
  home: (path = "/") => resolve(process.env.NEXT_PUBLIC_ASSURED_HOME_URL, path),
  cyber: (path = "/cyber") => resolve(process.env.NEXT_PUBLIC_ASSURED_CYBER_URL, path),
  women: (path = "/women") => resolve(process.env.NEXT_PUBLIC_ASSURED_WOMEN_URL, path),
  travel: (path = "/travel") => resolve(process.env.NEXT_PUBLIC_ASSURED_TRAVEL_URL, path),
};
