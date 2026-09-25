import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { RelatedLinks } from "@/components/shell/RelatedLinks";
import { DistressDemo } from "@/components/safety/DistressDemo";

export const metadata: Metadata = { title: "Distress Detection Demo (Prototype)" };

export default function DistressDemoPage() {
  return (
    <div>
      <PageHeader
        routeId="safety-distress-demo"
        eyebrow="Prototype"
        title="Distress detection demo"
        description="An experimental demonstration only. It listens for a sustained loud sound and asks if you're okay. It is not a real assault detector."
      />
      <DistressDemo />
      <RelatedLinks routeId="safety-distress-demo" />
    </div>
  );
}
