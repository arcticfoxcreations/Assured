import { WifiOff } from "lucide-react";

export function OfflineState() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-10 text-center">
      <WifiOff className="h-8 w-8 text-muted" aria-hidden="true" />
      <div>
        <p className="font-medium">You appear to be offline</p>
        <p className="mt-1 text-sm text-muted">
          Emergency call numbers still work without a connection — your
          phone&apos;s dialer doesn&apos;t need the internet.
        </p>
      </div>
    </div>
  );
}
