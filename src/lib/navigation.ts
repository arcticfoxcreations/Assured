// src/lib/navigation.ts
//
// Single source of truth for every route in ASSURED. The header, mobile
// nav, breadcrumbs, footer and (later) Mewvi should all read from this
// file instead of hard-coding paths, so the site never has dead links or
// duplicated route strings.

export type NavGroupId =
  | "emergency"
  | "report"
  | "learn"
  | "travel"
  | "community"
  | "personal";

export interface RouteDef {
  id: string;
  href: string;
  label: string;
  shortLabel?: string;
  description: string;
  group: NavGroupId;
  /** Shown in the primary mobile bottom nav (keep this list short). */
  inBottomNav?: boolean;
  /** Shown in the compact desktop header. */
  inHeaderNav?: boolean;
}

export const routes: RouteDef[] = [
  {
    id: "home",
    href: "/",
    label: "Home",
    description: "The ASSURED hub — a fast way into every safety tool.",
    group: "emergency",
    inBottomNav: true,
    inHeaderNav: true,
  },
  {
    id: "emergency",
    href: "/emergency",
    label: "Emergency",
    description: "Immediate emergency actions: call for help, share your location, reach police, fire, ambulance and more.",
    group: "emergency",
    inBottomNav: true,
    inHeaderNav: true,
  },
  {
    id: "emergency-quick",
    href: "/emergency/quick",
    label: "Quick Emergency Card",
    description: "A minimal, printable card of India's core emergency numbers — good to save, print or share as a QR code.",
    group: "emergency",
  },
  {
    id: "helplines",
    href: "/helplines",
    label: "Helplines",
    description: "A searchable directory of verified Indian safety helplines.",
    group: "emergency",
    inHeaderNav: true,
  },
  {
    id: "helplines-national",
    href: "/helplines/national",
    label: "National Helplines",
    description: "Helplines that apply across all of India.",
    group: "emergency",
  },
  {
    id: "helplines-states",
    href: "/helplines/states",
    label: "State Helplines",
    description: "Helplines specific to a state or union territory.",
    group: "emergency",
  },
  {
    id: "report",
    href: "/report",
    label: "Report",
    shortLabel: "Report",
    description: "Figure out what to do, who to contact and what to keep after an incident.",
    group: "report",
    inBottomNav: true,
    inHeaderNav: true,
  },
  {
    id: "report-cyber",
    href: "/report/cyber",
    label: "Report Cybercrime",
    description: "Guidance and official channels for reporting cybercrime.",
    group: "report",
  },
  {
    id: "report-women",
    href: "/report/women",
    label: "Report — Women's Safety",
    description: "Guidance and official channels for harassment, stalking and abuse.",
    group: "report",
  },
  {
    id: "report-financial-fraud",
    href: "/report/financial-fraud",
    label: "Report Financial Fraud",
    description: "Guidance and official channels for financial and banking fraud.",
    group: "report",
  },
  {
    id: "resources",
    href: "/resources",
    label: "Resources",
    description: "Verified guides and safety information across every ASSURED category.",
    group: "learn",
    inHeaderNav: true,
  },
  {
    id: "cyber",
    href: "/cyber",
    label: "Cyber Safety",
    description: "Guidance on phishing, scams, hacked accounts and online harassment.",
    group: "learn",
    inHeaderNav: true,
  },
  {
    id: "women",
    href: "/women",
    label: "Women's Safety",
    description: "Resources, helplines and reporting options for women's safety.",
    group: "learn",
    inHeaderNav: true,
  },
  {
    id: "children",
    href: "/children",
    label: "Child Safety",
    description: "Resources and official contacts for child safety.",
    group: "learn",
  },
  {
    id: "travel",
    href: "/travel",
    label: "Travel",
    description: "Start a journey, share your location, check in and travel with a guardian.",
    group: "travel",
    inBottomNav: true,
    inHeaderNav: true,
  },
  {
    id: "travel-routes",
    href: "/travel/routes",
    label: "Safe Routes",
    description: "Compare route options with ASSURED's safety indicators.",
    group: "travel",
  },
  {
    id: "travel-check-in",
    href: "/travel/check-in",
    label: "Safety Check-In",
    description: "Set a destination and expected arrival, and check in when you're safe.",
    group: "travel",
  },
  {
    id: "travel-guardian",
    href: "/travel/guardian",
    label: "Travel Guardian",
    description: "Track your journey against your planned route while ASSURED is open.",
    group: "travel",
  },
  {
    id: "location-share",
    href: "/location/share",
    label: "Share Location",
    description: "Share your current location with someone you trust.",
    group: "travel",
  },
  {
    id: "guardian",
    href: "/guardian",
    label: "Guardian View",
    description: "The read-only view a trusted contact sees during your journey.",
    group: "community",
  },
  {
    id: "community",
    href: "/community",
    label: "Community",
    description: "Community-submitted safety observations for public places.",
    group: "community",
    inHeaderNav: true,
  },
  {
    id: "safety-map",
    href: "/safety-map",
    label: "Safety Map",
    description: "Official data, community reports and ASSURED analysis on one map.",
    group: "community",
  },
  {
    id: "safety-map-area",
    href: "/safety-map/area",
    label: "Area Safety",
    description: "Official data, community reports and ASSURED analysis for one area.",
    group: "community",
  },
  {
    id: "cyber-scam-call",
    href: "/cyber/scam-call",
    label: "Suspicious Call Helper",
    description: "Describe a suspicious call or message and get guidance and official reporting options.",
    group: "learn",
  },
  {
    id: "safety-distress-demo",
    href: "/safety/distress-demo",
    label: "Distress Detection Demo",
    description: "An experimental prototype that listens for loud sounds and asks if you're okay.",
    group: "personal",
  },
  {
    id: "evidence",
    href: "/evidence",
    label: "Evidence Organizer",
    description: "Keep notes, files and a timeline organized after an incident.",
    group: "personal",
  },
  {
    id: "settings",
    href: "/settings",
    label: "Settings",
    description: "Theme, privacy, emergency contacts and data controls.",
    group: "personal",
  },
  {
    id: "demo",
    href: "/demo",
    label: "Guided Demo",
    description: "A scripted, presenter-controlled walkthrough of ASSURED's core safety flow. Every step is simulated.",
    group: "personal",
  },
];

export const navGroups: { id: NavGroupId; label: string }[] = [
  { id: "emergency", label: "Emergency" },
  { id: "report", label: "Report" },
  { id: "learn", label: "Learn" },
  { id: "travel", label: "Travel" },
  { id: "community", label: "Community" },
  { id: "personal", label: "Personal" },
];

export function getRoute(id: string): RouteDef | undefined {
  return routes.find((r) => r.id === id);
}

export function getRouteByHref(href: string): RouteDef | undefined {
  return routes.find((r) => r.href === href);
}

export function routesInGroup(group: NavGroupId): RouteDef[] {
  return routes.filter((r) => r.group === group);
}

export const bottomNavRoutes = routes.filter((r) => r.inBottomNav);
export const headerNavRoutes = routes.filter((r) => r.inHeaderNav);

/**
 * Lightweight related-links map for the Wikipedia-style cross-navigation
 * between domain pages. Keep each list to 3–5 entries.
 */
export const relatedRoutes: Record<string, string[]> = {
  emergency: ["emergency-quick", "helplines", "location-share", "guardian", "demo"],
  "emergency-quick": ["emergency", "helplines", "location-share"],
  helplines: ["emergency", "report", "resources"],
  women: ["emergency", "helplines", "report-women", "travel-guardian"],
  cyber: ["report-cyber", "cyber-scam-call", "evidence", "resources"],
  children: ["helplines", "women", "report"],
  travel: ["travel-guardian", "location-share", "emergency", "travel-routes"],
  "travel-guardian": ["guardian", "location-share", "travel-check-in", "demo"],
  report: ["evidence", "helplines", "resources"],
  community: ["safety-map", "safety-map-area", "travel-routes"],
  "safety-map": ["safety-map-area", "community", "travel-routes"],
  "safety-map-area": ["safety-map", "community"],
  "travel-routes": ["travel-check-in", "safety-map", "community"],
  "travel-check-in": ["travel-guardian", "location-share", "emergency"],
  resources: ["helplines", "cyber", "women"],
  evidence: ["report", "cyber", "helplines"],
  "cyber-scam-call": ["report-financial-fraud", "report-cyber", "evidence", "helplines"],
  "safety-distress-demo": ["emergency", "location-share", "travel-check-in"],
  demo: ["emergency", "travel-guardian", "guardian", "location-share"],
};
