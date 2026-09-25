import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { ScamCallHelper } from "@/components/safety/ScamCallHelper";

export const metadata: Metadata = { title: "Suspicious Call Helper" };

export default function ScamCallPage() {
  return (
    <div>
      <PageHeader
        routeId="cyber-scam-call"
        eyebrow="Learn"
        title="Suspicious call or message"
        description="Describe what happened and get guidance and official reporting options. ASSURED can't intercept or screen phone calls from a browser."
      />
      <ScamCallHelper />
      <RelatedLinks routeId="cyber-scam-call" />
    </div>
  );
}
