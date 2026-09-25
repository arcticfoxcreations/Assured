// src/types/common.ts

export type FeatureStatus = "available" | "coming-later" | "browser-limit";

export interface ReportGuide {
  id: string;
  title: string;
  whatToDoNow: string[];
  whoToContact: string[];
  whereToReport: string[];
  whatInformationToKeep: string[];
  whatEvidenceToPreserve: string[];
}
