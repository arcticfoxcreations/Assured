import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { HelplineList } from "@/components/helplines/HelplineList";
import { nationalHelplines } from "@/lib/helplines";

export const metadata: Metadata = { title: "National Helplines" };

export default function NationalHelplinesPage() {
  return (
    <div>
      <PageHeader
        routeId="helplines-national"
        eyebrow="Helplines"
        title="National helplines"
        description="Helplines that apply across all of India, each verified against an official government source."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <HelplineList helplines={nationalHelplines} />
      </div>
    </div>
  );
}
