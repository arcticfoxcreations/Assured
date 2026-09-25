import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "Child Safety" };

const childHelplineIds = ["child-1098", "erss-112", "ncrp-portal"];

export default function ChildSafetyPage() {
  const helplines = nationalHelplines.filter((h) => childHelplineIds.includes(h.id));
  return (
    <div>
      <PageHeader
        routeId="children"
        eyebrow="Learn"
        title="Child Safety"
        description="Resources and official contacts for child safety. Call 1098 for any child who needs care and protection."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
        <Card>
          <p className="font-medium">Guidance</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted">
            <li>If a child is in immediate danger, call 112.</li>
            <li>Call 1098 (CHILDLINE) for any child needing care and protection.</li>
            <li>
              Report online content involving a child on the National Cyber Crime Reporting
              Portal (cybercrime.gov.in), which has a special focus on crimes against children.
            </li>
            <li>Do not share or forward images or videos of the child, even to raise awareness.</li>
          </ul>
        </Card>

        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Verified helplines
          </p>
          <div className="space-y-3">
            {helplines.map((h) => (
              <HelplineCard key={h.id} helpline={h} />
            ))}
          </div>
        </div>
      </div>
      <RelatedLinks routeId="children" />
    </div>
  );
}
