import type { Metadata } from "next";
import Link from "next/link";
import { Play, Share2, Timer, ShieldCheck, Map, LifeBuoy, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ActiveJourneyBanner } from "@/components/travel/ActiveJourneyBanner";
import { RelatedLinks } from "@/components/shell/RelatedLinks";

export const metadata: Metadata = { title: "Travel" };

const tools = [
  { href: "/travel/check-in", icon: Play, label: "Start Journey", description: "Set a destination and expected arrival time." },
  { href: "/location/share", icon: Share2, label: "Share Location", description: "Send your current location to a trusted contact." },
  { href: "/travel/check-in", icon: Timer, label: "Safety Check-In", description: "Check in before your timer runs out." },
  { href: "/travel/routes", icon: Map, label: "Safe Routes", description: "Compare route options with safety indicators." },
  { href: "/travel/guardian", icon: ShieldCheck, label: "Guardian", description: "Track your journey against your planned route." },
  { href: "/emergency", icon: LifeBuoy, label: "Nearby Help", description: "Find emergency options near you." },
];

export default function TravelPage() {
  return (
    <div>
      <PageHeader
        routeId="travel"
        eyebrow="Travel"
        title="Travel safety"
        description="Route safety, check-ins and a travel guardian — connected tools for safer journeys."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <ActiveJourneyBanner />
      <div className="grid grid-cols-2 gap-3">
        {tools.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="flex h-full flex-col gap-2 hover:bg-surface-2">
              <t.icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <span className="font-medium">{t.label}</span>
              <span className="text-xs text-muted">{t.description}</span>
            </Card>
          </Link>
        ))}
      </div>
      </div>
      <RelatedLinks routeId="travel" />
    </div>
  );
}
