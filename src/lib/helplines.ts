// src/lib/helplines.ts
//
// Typed access to the verified helpline dataset. Pages should import
// from here rather than reading the JSON files directly, so filtering
// logic lives in one place.

import type { Helpline, HelplineSource } from "@/types/helpline";
import nationalData from "@/data/helplines/national.json";
import sourcesData from "@/data/helplines/sources.json";
import statesData from "@/data/helplines/states/index.json";

export const nationalHelplines: Helpline[] = nationalData.entries as Helpline[];
export const helplineSources: HelplineSource[] = sourcesData.sources as HelplineSource[];

export interface StateEntry {
  code: string;
  name: string;
  verified: boolean;
}

export const stateList: StateEntry[] = statesData.states as StateEntry[];

export function getSource(sourceId: string): HelplineSource | undefined {
  return helplineSources.find((s) => s.id === sourceId);
}

export function getAllCategories(): string[] {
  const set = new Set<string>();
  for (const h of nationalHelplines) {
    for (const c of h.category) set.add(c);
  }
  return Array.from(set).sort();
}

export function filterHelplines(
  helplines: Helpline[],
  { query, category }: { query?: string; category?: string }
): Helpline[] {
  let results = helplines;

  if (category) {
    results = results.filter((h) => h.category.includes(category));
  }

  if (query && query.trim()) {
    const q = query.trim().toLowerCase();
    results = results.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.description.toLowerCase().includes(q) ||
        h.category.some((c) => c.toLowerCase().includes(q)) ||
        h.number.toLowerCase().includes(q)
    );
  }

  return results;
}

/** True if a helpline has a real dialable phone number (vs. an online-only portal). */
export function isDialable(helpline: Helpline): boolean {
  return /^[0-9][0-9-]*$/.test(helpline.number.trim());
}

export function telHref(number: string): string {
  return `tel:${number.replace(/[^0-9]/g, "")}`;
}
