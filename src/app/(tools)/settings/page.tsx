import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { FeatureStatusBadge } from "@/components/ui/FeatureStatus";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Settings" };

const sections = [
  { label: "Privacy", note: "Control what ASSURED stores and for how long." },
  { label: "Emergency contacts", note: "Add and manage trusted contacts." },
  { label: "Notification preferences", note: "Choose how you're notified about check-ins and alerts." },
  { label: "Location-sharing preferences", note: "Control default sharing duration and retention." },
  { label: "Data controls", note: "Export or delete your ASSURED data." },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader
        routeId="settings"
        eyebrow="Personal"
        title="Settings"
        description="Theme, privacy, emergency contacts and data controls."
      />
      <div className="mx-auto w-full max-w-2xl px-4 py-6 space-y-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium">Theme</p>
            <p className="mt-0.5 text-sm text-muted">Light, dark, or match your system.</p>
          </div>
          <ThemeToggle />
        </Card>

        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="font-medium">Guided demo walkthrough</p>
            <p className="mt-0.5 text-sm text-muted">
              A scripted, simulated tour of the core safety flow.
            </p>
          </div>
          <Button href="/demo" variant="secondary" size="sm">
            Open
          </Button>
        </Card>

        {sections.map((s) => (
          <Card key={s.label} className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium">{s.label}</p>
              <p className="mt-0.5 text-sm text-muted">{s.note}</p>
            </div>
            <FeatureStatusBadge status="coming-later" />
          </Card>
        ))}
      </div>
    </div>
  );
}
