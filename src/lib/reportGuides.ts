// src/lib/reportGuides.ts
//
// Typed access to the report-guide dataset (src/data/resources/report-guides).

import cyber from "@/data/resources/report-guides/cyber.json";
import women from "@/data/resources/report-guides/women.json";
import financialFraud from "@/data/resources/report-guides/financial-fraud.json";

export interface OfficialLink {
  label: string;
  url: string;
  sourceId: string;
}

export interface ReportGuideFull {
  id: string;
  title: string;
  summary: string;
  whatToDoNow: string[];
  whoToContact: string[];
  whereToReport: string[];
  whatInformationToKeep: string[];
  whatEvidenceToPreserve: string[];
  officialLinks: OfficialLink[];
  helplineIds: string[];
  relatedRoutes: string[];
}

const guides: Record<string, ReportGuideFull> = {
  cyber: cyber as ReportGuideFull,
  women: women as ReportGuideFull,
  "financial-fraud": financialFraud as ReportGuideFull,
};

export function getReportGuide(id: string): ReportGuideFull | undefined {
  return guides[id];
}
