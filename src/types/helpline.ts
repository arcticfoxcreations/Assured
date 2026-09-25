// src/types/helpline.ts
//
// Shape for verified helpline entries. Part 2 populates real data
// against this type — Part 1 intentionally ships with no invented
// numbers, emails or URLs.

export interface HelplineSource {
  id: string;
  publisher: string;
  title: string;
  url: string;
  verifiedOn: string; // ISO date
}

export interface Helpline {
  id: string;
  name: string;
  category: string[];
  number: string;
  email?: string;
  website?: string;
  stateCode: string | "IN";
  city?: string;
  description: string;
  availability: string;
  sourceId: string;
  verifiedOn: string; // ISO date
}
