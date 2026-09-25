import { Ban } from "lucide-react";

export function UnsupportedBrowserState({
  feature,
}: {
  feature: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-10 text-center">
      <Ban className="h-8 w-8 text-muted" aria-hidden="true" />
      <div>
        <p className="font-medium">{feature} isn&apos;t supported here</p>
        <p className="mt-1 text-sm text-muted">
          Try the latest version of Chrome, Safari or Edge on this device.
        </p>
      </div>
    </div>
  );
}
