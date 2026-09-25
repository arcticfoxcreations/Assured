import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { GuidedDemo } from "@/components/demo/GuidedDemo";

export const metadata: Metadata = { title: "Guided Demo" };

export default function DemoPage() {
  return (
    <div>
      <PageHeader
        routeId="demo"
        eyebrow="Demo"
        title="Guided Demo Walkthrough"
        description="A scripted, presenter-controlled walkthrough of ASSURED's core safety flow — every step is simulated."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <GuidedDemo />
      </div>
      <RelatedLinks routeId="demo" />
    </div>
  );
}
