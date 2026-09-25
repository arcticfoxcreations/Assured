import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { ArrowRight, ShieldCheck, Users, Baby, Phone, FileWarning, FolderLock } from "lucide-react";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "Resources" };

const hubs = [
  { href: "/cyber", icon: ShieldCheck, label: "Cyber Safety", description: "Phishing, scams, hacked accounts, online harassment." },
  { href: "/women", icon: Users, label: "Women's Safety", description: "Emergency guidance, helplines and reporting." },
  { href: "/children", icon: Baby, label: "Child Safety", description: "Guidance and official contacts for child safety." },
  { href: "/helplines", icon: Phone, label: "Helpline Directory", description: `${nationalHelplines.length} verified national helplines.` },
  { href: "/report", icon: FileWarning, label: "Report Center", description: "Practical guidance for every report category." },
  { href: "/evidence", icon: FolderLock, label: "Evidence Organizer", description: "Keep notes, files and a timeline organized." },
];

export default function ResourcesPage() {
  return (
    <div>
      <PageHeader
        routeId="resources"
        eyebrow="Learn"
        title="Trusted resources"
        description="Verified guides and safety information across every ASSURED category, each traceable to an official source."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 grid gap-3 sm:grid-cols-2">
        {hubs.map((h) => (
          <Link key={h.href} href={h.href}>
            <Card className="flex h-full items-start gap-3 hover:bg-surface-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                <h.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              </span>
              <span>
                <span className="flex items-center gap-1 font-medium">
                  {h.label}
                  <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden="true" />
                </span>
                <span className="mt-0.5 block text-sm text-muted">{h.description}</span>
              </span>
            </Card>
          </Link>
        ))}
      </div>
      <RelatedLinks routeId="resources" />
    </div>
  );
}
