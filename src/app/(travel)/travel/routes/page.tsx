import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { RoutePlanner } from "@/components/travel/RoutePlanner";

export const metadata: Metadata = { title: "Safe routes" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="travel-routes"
        eyebrow="Travel"
        title="Safe routes"
        description="Compare Fastest, Safety-Focused and Balanced routes. Indicators are ASSURED's own analysis, with the reasons shown."
        actions={<FeatureStatusBadge status="available" />}
      />
      <RoutePlanner />
      <RelatedLinks routeId="travel-routes" />
    </div>
  );
}
