import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, FileWarning, FolderLock, ArrowRight, Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "Cyber Safety" };

const cyberHelplineIds = ["cybercrime-1930", "ncrp-portal", "sancharsaathi"];

const guides = [
  {
    title: "Report Cybercrime",
    href: "/report/cyber",
    icon: FileWarning,
    description: "What to do now, who to contact, and where to file an official complaint.",
  },
  {
    title: "Financial Fraud",
    href: "/report/financial-fraud",
    icon: ShieldAlert,
    description: "Banking fraud, UPI scams and phishing — act fast, funds can sometimes be frozen.",
  },
  {
    title: "Suspicious call or message",
    href: "/cyber/scam-call",
    icon: Phone,
    description: "Describe it and get guidance and official reporting options. Browsers can't screen calls for you.",
  },
  {
    title: "Evidence Organizer",
    href: "/evidence",
    icon: FolderLock,
    description: "Keep screenshots, messages and a timeline organized after an incident.",
  },
];

export default function CyberSafetyPage() {
  const helplines = nationalHelplines.filter((h) => cyberHelplineIds.includes(h.id));
  return (
    <div>
      <PageHeader
        routeId="cyber"
        eyebrow="Learn"
        title="Cyber Safety"
        description="Guidance on phishing, scams, hacked accounts and online harassment, with verified reporting channels."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-6">
        <div className="grid gap-3 sm:grid-cols-2">
          {guides.map((g) => (
            <Link key={g.href} href={g.href}>
              <Card className="flex h-full items-start gap-3 hover:bg-surface-2">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <g.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <span>
                  <span className="flex items-center gap-1 font-medium">
                    {g.title}
                    <ArrowRight className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{g.description}</span>
                </span>
              </Card>
            </Link>
          ))}
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
      <RelatedLinks routeId="cyber" />
    </div>
  );
}
