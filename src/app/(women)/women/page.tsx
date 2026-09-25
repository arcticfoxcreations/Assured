import type { Metadata } from "next";
import Link from "next/link";
import { FileWarning, Scale, ArrowRight, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "Women's Safety" };

const womenHelplineIds = ["women-181", "shebox-portal", "ncw-complaint", "legal-aid-15100"];

export default function WomensSafetyPage() {
  const helplines = nationalHelplines.filter((h) => womenHelplineIds.includes(h.id));
  return (
    <div>
      <PageHeader
        routeId="women"
        eyebrow="Learn"
        title="Women's Safety"
        description="Resources, verified helplines and reporting options for harassment, stalking, online abuse and workplace harassment."
        actions={
          <Button href="tel:112" variant="emergency" size="sm">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Call 112
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href="/report/women">
            <Card className="flex h-full items-start gap-3 hover:bg-surface-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <FileWarning className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center gap-1 font-medium">
                  Report an incident
                  <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-sm text-muted">
                  What to do now, who to contact, and where to report.
                </span>
              </span>
            </Card>
          </Link>
          <a href="https://shebox.wcd.gov.in" target="_blank" rel="noopener noreferrer">
            <Card className="flex h-full items-start gap-3 hover:bg-surface-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center gap-1 font-medium">
                  SHe-Box
                  <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-sm text-muted">
                  Official portal for workplace harassment complaints (POSH Act, 2013).
                </span>
              </span>
            </Card>
          </a>
        </div>

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
      <RelatedLinks routeId="women" />
    </div>
  );
}
