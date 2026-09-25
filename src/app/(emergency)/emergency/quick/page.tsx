import type { Metadata } from "next";
import Image from "next/image";
import { Phone } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = {
  title: "Quick Emergency Card",
  description:
    "A minimal, printable card of India's core emergency numbers — 112 and verified national helplines. Good to save, print or share as a QR code.",
};

// Curated subset for a fast, no-scroll reference card — the full,
// filterable directory lives at /helplines.
const quickIds = [
  "erss-112",
  "women-181",
  "child-1098",
  "cybercrime-1930",
  "telemanas",
  "railmadad-139",
  "nhai-1033",
];

export default function EmergencyQuickPage() {
  const primary = nationalHelplines.find((h) => h.id === "erss-112");
  const rest = nationalHelplines.filter(
    (h) => quickIds.includes(h.id) && h.id !== "erss-112"
  );

  return (
    <div>
      <PageHeader
        routeId="emergency-quick"
        eyebrow="Emergency"
        title="Quick emergency card"
        description="The core numbers on one short page — good to bookmark, print, or share as a QR code so it's fast to reach on someone else's phone too."
      />

      <div className="mx-auto w-full max-w-lg px-4 py-6 print:max-w-full">
        <div className="flex animate-fade-up items-center gap-2">
          <Image
            src="/assets/logos/assured-mark.png"
            alt=""
            width={32}
            height={32}
            className="dark:hidden print:hidden"
          />
          <Image
            src="/assets/logos/assured-mark-dark.png"
            alt=""
            width={32}
            height={32}
            className="hidden dark:block print:hidden"
          />
          <div>
            <p className="text-sm font-semibold leading-none">ASSURED Emergency</p>
            <p className="mt-0.5 text-xs text-muted">Your safety assurance</p>
          </div>
        </div>

        {primary && (
          <section className="mt-6 animate-fade-up rounded-3xl border border-emergency/25 bg-gradient-to-br from-emergency/10 via-emergency/5 to-transparent p-5 shadow-soft print:border-black/20 print:bg-none print:shadow-none">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emergency">
              India&apos;s unified emergency number
            </p>
            <p className="mt-1 text-4xl font-medium tracking-tight">
              {primary.number}
            </p>
            <a
              href="tel:112"
              className="mt-4 inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-emergency px-6 text-base font-semibold text-emergency-foreground shadow-glow transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:opacity-95 active:translate-y-0 print:hidden"
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              Call 112
            </a>
            <p className="mt-3 text-xs text-muted">
              Calling opens your phone&apos;s dialer — you still press call. On
              desktop, use your phone instead.
            </p>
          </section>
        )}

        <section className="mt-6 space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted">
            Other verified helplines
          </p>
          {rest.map((h) => (
            <HelplineCard key={h.id} helpline={h} />
          ))}
        </section>
      </div>

      <RelatedLinks routeId="emergency-quick" />
    </div>
  );
}
