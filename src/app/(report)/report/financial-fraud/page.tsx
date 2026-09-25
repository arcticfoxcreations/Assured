import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { ReportGuideView } from "@/components/report/ReportGuideView";
import { getReportGuide } from "@/lib/reportGuides";

export const metadata: Metadata = { title: "Report Financial Fraud" };

export default function ReportCategoryPage() {
  const guide = getReportGuide("financial-fraud")!;
  return (
    <div>
      <PageHeader
        routeId="report-financial-fraud"
        eyebrow="Report"
        title="Report Financial Fraud"
        description="Guidance for banking fraud, phishing and identity theft, with official reporting channels."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <ReportGuideView guide={guide} />
      </div>
      <RelatedLinks routeId="report-financial-fraud" />
    </div>
  );
}
