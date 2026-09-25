import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { Card } from "@/components/ui/Card";
import { HelplineList } from "@/components/helplines/HelplineList";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "Helplines" };

export default function HelplinesPage() {
  return (
    <div>
      <PageHeader
        routeId="helplines"
        eyebrow="Emergency"
        title="Helpline directory"
        description={`${nationalHelplines.length} verified national helplines, each linked to its official government source. Search or filter by category below.`}
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link href="/helplines/national">
            <Card className="hover:bg-surface-2">
              <p className="font-medium">National</p>
              <p className="mt-0.5 text-sm text-muted">{nationalHelplines.length} verified entries</p>
            </Card>
          </Link>
          <Link href="/helplines/states">
            <Card className="hover:bg-surface-2">
              <p className="font-medium">By State</p>
              <p className="mt-0.5 text-sm text-muted">Browse state &amp; UT coverage</p>
            </Card>
          </Link>
        </div>
        <HelplineList helplines={nationalHelplines} />
      </div>
      <RelatedLinks routeId="helplines" />
    </div>
  );
}
