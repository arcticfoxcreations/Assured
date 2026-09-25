import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { LocationShare } from "@/components/travel/LocationShare";

export const metadata: Metadata = { title: "Share my location" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="location-share"
        eyebrow="Travel"
        title="Share my location"
        description="With your permission, ASSURED reads your current location and prepares a message you can review and edit before sending."
        actions={<FeatureStatusBadge status="available" />}
      />
      <LocationShare />
      <RelatedLinks routeId="location-share" />
    </div>
  );
}
