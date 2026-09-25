import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { ReportGuideView } from "@/components/report/ReportGuideView";
import { getReportGuide } from "@/lib/reportGuides";

export const metadata: Metadata = { title: "Report — Women's Safety" };

export default function ReportCategoryPage() {
  const guide = getReportGuide("women")!;
  return (
    <div>
      <PageHeader
        routeId="report-women"
        eyebrow="Report"
        title="Report — Women's Safety"
        description="Guidance for harassment, stalking and online abuse, with official reporting channels."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <ReportGuideView guide={guide} />
      </div>
      <RelatedLinks routeId="report-women" />
    </div>
  );
}
