// src/lib/travel/types.ts
export type LatLng = { lat: number; lng: number };
export type Mode = "walking" | "driving" | "cycling";
export type JourneyStatus = "active" | "arrived" | "help" | "ended";
export type ViewStatus = "active" | "overdue" | "arrived" | "help";

export interface Fix extends LatLng {
  accuracy: number | null;
  at: number; // epoch ms
}

export interface Contact {
  name: string;
  phone: string;
  email?: string; // sent to the server ONLY if the traveller turns on automatic alerts
}

export interface RouteMeta {
  distanceM: number;
  durationS: number;
  source: "routing" | "direct";
}

export interface Battery {
  level: number; // 0..1
  charging: boolean;
}

export const CATEGORIES = [
  { id: "poor_lighting", label: "Poor lighting", weight: 1.5 },
  { id: "unsafe_road", label: "Unsafe road", weight: 2 },
  { id: "harassment", label: "Harassment concern", weight: 3 },
  { id: "suspicious", label: "Suspicious activity", weight: 2 },
  { id: "transport", label: "Transport issue", weight: 1 },
  { id: "isolated", label: "Isolated location", weight: 2 },
  { id: "resource_issue", label: "Emergency resource issue", weight: 1 },
  { id: "other", label: "Other", weight: 1 },
] as const;
export type CategoryId = (typeof CATEGORIES)[number]["id"];

export interface PublicReport extends LatLng {
  id: string;
  category: CategoryId;
  description: string;
  occurredAt: number;
  createdAt: number;
}

export interface Resource extends LatLng {
  id: string;
  kind: "police" | "hospital" | "fire_station" | "pharmacy" | "fuel" | "atm";
  name: string;
}

export const MODE_SPEED_MPS: Record<Mode, number> = {
  walking: 1.4,
  cycling: 4.2,
  driving: 8.3,
};
