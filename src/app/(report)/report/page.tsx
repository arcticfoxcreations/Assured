import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { RelatedLinks } from "@/components/shell/RelatedLinks";

export const metadata: Metadata = { title: "Report" };

const categories = [
  { label: "Cybercrime", href: "/report/cyber" },
  { label: "Financial Fraud", href: "/report/financial-fraud" },
  { label: "Women's Safety", href: "/report/women" },
  { label: "Child Safety", href: "/children" },
  { label: "Harassment", href: "/report/women" },
  { label: "Stalking", href: "/report/women" },
  { label: "Online Abuse", href: "/report/cyber" },
  { label: "Workplace Harassment", href: "/report/women" },
  { label: "Lost/Stolen Phone", href: "/report/cyber" },
  { label: "Identity Theft", href: "/report/financial-fraud" },
  { label: "Other Safety Concern", href: "/report/cyber" },
];

export default function ReportPage() {
  return (
    <div>
      <PageHeader
        routeId="report"
        eyebrow="Report"
        title="What happened?"
        description="Choose the category closest to your situation. Each one explains what to do now, who to contact, where to report, and what to keep."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {categories.map((c) => (
            <Link key={c.label} href={c.href}>
              <Card className="flex items-center justify-between hover:bg-surface-2">
                <span className="font-medium">{c.label}</span>
                <ArrowRight className="h-4 w-4 text-muted" aria-hidden="true" />
              </Card>
            </Link>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted">
          ASSURED never submits a report to a real authority on your behalf.
          Every category points you to the correct official channel and
          helps you prepare what you&apos;ll need to bring or send.
        </p>
      </div>
      <RelatedLinks routeId="report" />
    </div>
  );
}
