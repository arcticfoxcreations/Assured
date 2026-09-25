import Link from "next/link";
import {
  ShieldCheck,
  Siren,
  Phone,
  Compass,
  Users,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Logo } from "@/components/shell/Logo";
import { HomeLocationMap } from "@/components/home/HomeLocationMap";

const domains = [
  {
    href: "/emergency",
    icon: Siren,
    title: "Emergency",
    description: "112, location sharing and quick emergency actions.",
  },
  {
    href: "/helplines",
    icon: Phone,
    title: "Helplines",
    description: "A searchable directory of verified safety helplines.",
  },
  {
    href: "/women",
    icon: Users,
    title: "Women & Children",
    description: "Resources, helplines and reporting for women and children.",
  },
  {
    href: "/cyber",
    icon: ShieldCheck,
    title: "Cyber Safety",
    description: "Guidance on scams, fraud, hacked accounts and harassment.",
  },
  {
    href: "/travel",
    icon: Compass,
    title: "Travel",
    description: "Check-in, location sharing and a travel guardian.",
  },
  {
    href: "/resources",
    icon: BookOpen,
    title: "Trusted Resources",
    description: "Verified guides across every ASSURED safety category.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="mx-auto w-full max-w-2xl animate-fade-up px-4 pb-8 pt-10 text-center sm:pt-16">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 shadow-soft">
          <Logo size={38} />
        </div>
        <h1 className="mt-5 text-3xl font-medium tracking-tight sm:text-4xl">
          ASSURED
        </h1>
        <p className="mt-1 text-sm font-medium text-primary">
          Your safety assurance
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted">
          One place for emergency help, safer journeys, trusted resources and
          everyday safety.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button href="/emergency" size="lg">
            Get Started
          </Button>
          <Button href="/resources" variant="secondary" size="lg">
            Explore Safety Tools
          </Button>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 pb-8">
        <Link
          href="/emergency"
          className="flex items-center justify-between gap-3 rounded-2xl bg-emergency px-5 py-4 text-emergency-foreground shadow-glow transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:opacity-95"
        >
          <span className="flex items-center gap-3">
            <Siren className="h-6 w-6" aria-hidden="true" />
            <span>
              <span className="block text-base font-semibold">
                SOS / Emergency
              </span>
              <span className="block text-xs opacity-90">
                Fast access to 112 and emergency actions
              </span>
            </span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
        </Link>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 pb-10">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Safety domains
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {domains.map((d) => (
            <Link key={d.href} href={d.href}>
              <Card className="flex h-full items-start gap-3 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-soft-hover">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/5">
                  <d.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                </span>
                <span>
                  <span className="block font-medium">{d.title}</span>
                  <span className="mt-0.5 block text-sm text-muted">
                    {d.description}
                  </span>
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <HomeLocationMap />

      <section className="mx-auto w-full max-w-2xl px-4 pb-16">
        <Card className="flex items-center justify-between gap-3 bg-cream/40">
          <div>
            <p className="font-medium">Need help finding something?</p>
            <p className="mt-0.5 text-sm text-muted">
              Tap the Mewvi icon in the corner for quick shortcuts around
              ASSURED.
            </p>
          </div>
        </Card>
      </section>
    </div>
  );
}
