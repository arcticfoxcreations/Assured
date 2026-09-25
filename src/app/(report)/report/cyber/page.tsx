import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { ReportGuideView } from "@/components/report/ReportGuideView";
import { getReportGuide } from "@/lib/reportGuides";

export const metadata: Metadata = { title: "Report Cybercrime" };

export default function ReportCategoryPage() {
  const guide = getReportGuide("cyber")!;
  return (
    <div>
      <PageHeader
        routeId="report-cyber"
        eyebrow="Report"
        title="Report Cybercrime"
        description="Guidance and official channels for reporting cybercrime, including the National Cyber Crime Reporting Portal."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <ReportGuideView guide={guide} />
      </div>
      <RelatedLinks routeId="report-cyber" />
    </div>
  );
}
