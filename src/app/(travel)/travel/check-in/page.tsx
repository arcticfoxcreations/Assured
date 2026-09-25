import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { CheckIn } from "@/components/travel/CheckIn";

export const metadata: Metadata = { title: "Safety check-in" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="travel-check-in"
        eyebrow="Travel"
        title="Safety check-in"
        description="Set a destination, an expected arrival time and a trusted contact. Check in before your timer runs out."
        actions={<FeatureStatusBadge status="available" />}
      />
      <CheckIn />
      <RelatedLinks routeId="travel-check-in" />
    </div>
  );
}
