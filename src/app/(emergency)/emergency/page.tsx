import type { Metadata } from "next";
import Link from "next/link";
import { Phone, Share2, Users, Baby, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "Emergency" };

const quickHelplineIds = ["women-181", "child-1098", "cybercrime-1930"];
const quickActions = [
  { label: "Women", icon: Users, href: "/women" },
  { label: "Child", icon: Baby, href: "/children" },
  { label: "Cyber", icon: ShieldCheck, href: "/cyber" },
];

export default function EmergencyPage() {
  const quickHelplines = nationalHelplines.filter((h) => quickHelplineIds.includes(h.id));

  return (
    <div>
      <PageHeader
        routeId="emergency"
        eyebrow="Emergency"
        title="Get help now"
        description="On a phone, calling opens your phone's dialer — you still need to press call. ASSURED cannot place a call or contact authorities on its own."
      />

      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <Card className="border-emergency/30 bg-emergency/5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emergency">
                India&apos;s unified emergency number
              </p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">112</p>
            </div>
            <FeatureStatusBadge status="available" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button href="tel:112" variant="emergency" size="lg">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call 112
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted">
            On desktop, there&apos;s no dialer to open — use your phone to call.
            Verified against the Ministry of Home Affairs&apos; Emergency Response
            Support System (112.gov.in).
          </p>
        </Card>

        <Link
          href="/emergency/quick"
          className="mt-4 block rounded-xl border border-border bg-surface p-3 text-sm hover:bg-surface-2"
        >
          Open the quick emergency card — good to save, print or share as a QR code →
        </Link>
        <Card className="mt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Share my location</p>
              <p className="mt-0.5 text-sm text-muted">
                Send your current location to someone you trust.
              </p>
            </div>
            <FeatureStatusBadge status="available" />
          </div>
          <Button href="/location/share" variant="secondary" className="mt-3">
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Open location sharing
          </Button>
        </Card>

        <div className="mt-6">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Quick access
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                href={a.href}
                className="flex flex-col items-center gap-2 rounded-2xl border border-border bg-surface px-2 py-4 text-center text-sm font-medium hover:bg-surface-2"
              >
                <a.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                {a.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Verified emergency helplines
          </p>
          {quickHelplines.map((h) => (
            <HelplineCard key={h.id} helpline={h} />
          ))}
        </div>

        <Card className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">Emergency contacts</p>
              <p className="mt-0.5 text-sm text-muted">
                Add people ASSURED can help you reach quickly.
              </p>
            </div>
            <FeatureStatusBadge status="coming-later" />
          </div>
          <Link
            href="/settings"
            className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
          >
            Configure in Settings →
          </Link>
        </Card>

        <Card className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="font-medium">Find nearby help</p>
            <FeatureStatusBadge status="browser-limit" />
          </div>
          <p className="mt-1 text-sm text-muted">
            Will use your device&apos;s location, with your permission, to
            suggest nearby police stations, hospitals and fire stations.
            Coverage depends on publicly available map data and can vary by
            area.
          </p>
        </Card>
      </div>

      <RelatedLinks routeId="emergency" />
    </div>
  );
}
