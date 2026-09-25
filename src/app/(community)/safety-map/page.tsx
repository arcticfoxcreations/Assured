import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { AreaSafety } from "@/components/travel/AreaSafety";

export const metadata: Metadata = { title: "Safety map" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="safety-map"
        eyebrow="Community"
        title="Safety map"
        description="Three clearly separated layers, so it is always obvious what is official, what is community-submitted, and what ASSURED derived."
        actions={<FeatureStatusBadge status="available" />}
      />
      <AreaSafety mode="map" />
      <RelatedLinks routeId="safety-map" />
    </div>
  );
}
