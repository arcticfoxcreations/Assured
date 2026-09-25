import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { LiveTracker } from "@/components/travel/LiveTracker";

export const metadata: Metadata = { title: "Travel guardian" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="travel-guardian"
        eyebrow="Travel"
        title="Travel guardian"
        description="Tracks your journey against your planned route while ASSURED is open on your screen and has permission."
        actions={<FeatureStatusBadge status="browser-limit" />}
      />
      <LiveTracker />
      <RelatedLinks routeId="travel-guardian" />
    </div>
  );
}
