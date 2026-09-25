import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { GuardianView } from "@/components/travel/GuardianView";

export const metadata: Metadata = { title: "Guardian view" };

export default function Page() {
  return (
    <div>
      <PageHeader
        routeId="guardian"
        eyebrow="Community"
        title="Guardian view"
        description="A private, read-only view a trusted contact opens with an expiring link — never a predictable URL."
        actions={<FeatureStatusBadge status="available" />}
      />
      <GuardianView />
      <RelatedLinks routeId="guardian" />
    </div>
  );
}
