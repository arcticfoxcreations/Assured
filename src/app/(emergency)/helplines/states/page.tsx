import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { stateList } from "@/lib/helplines";

export const metadata: Metadata = { title: "State Helplines" };

export default function StateHelplinesPage() {
  return (
    <div>
      <PageHeader
        routeId="helplines-states"
        eyebrow="Helplines"
        title="State & union territory helplines"
        description="National helplines already apply everywhere. State-specific entries are added here one state at a time as each is verified against an official state source — no numbers are invented in the meantime."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stateList.map((s) => (
            <Card key={s.code} className="flex flex-col gap-2">
              <p className="text-sm font-medium">{s.name}</p>
              <FeatureStatusBadge status={s.verified ? "available" : "coming-later"} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
