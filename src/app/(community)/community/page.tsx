import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { ReportForm } from "@/components/travel/ReportForm";

export const metadata: Metadata = { title: "Community reports" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="community"
        eyebrow="Community"
        title="Community reports"
        description="Report a place or situation of concern. No accusations against individuals, no names, no exact doorsteps."
        actions={<FeatureStatusBadge status="available" />}
      />
      <ReportForm />
      <RelatedLinks routeId="community" />
    </div>
  );
}
