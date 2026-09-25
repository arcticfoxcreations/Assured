import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { AreaSafety } from "@/components/travel/AreaSafety";

export const metadata: Metadata = { title: "Area safety" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="safety-map-area"
        eyebrow="Community"
        title="Area safety"
        description="A breakdown for one area: official data, community reports and ASSURED analysis, each labelled."
        actions={<FeatureStatusBadge status="available" />}
      />
      <AreaSafety mode="area" />
      <RelatedLinks routeId="safety-map-area" />
    </div>
  );
}
