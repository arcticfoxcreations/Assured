import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { EvidenceOrganizer } from "@/components/evidence/EvidenceOrganizer";

export const metadata: Metadata = { title: "Evidence Organizer" };

export default function EvidencePage() {
  return (
    <div>
      <PageHeader
        routeId="evidence"
        eyebrow="Personal"
        title="Evidence organizer"
        description="Keep notes, screenshots, documents and dates in one place, then build a summary, timeline and checklist. This helps you stay organized — it does not make anything legally admissible."
        actions={<FeatureStatusBadge status="available" />}
      />
      <Suspense fallback={<p className="mx-auto max-w-2xl px-4 py-6 text-sm text-muted">Loading…</p>}>
        <EvidenceOrganizer />
      </Suspense>
      <RelatedLinks routeId="evidence" />
    </div>
  );
}
