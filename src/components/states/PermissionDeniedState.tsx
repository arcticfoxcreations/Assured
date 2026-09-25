import { ShieldAlert } from "lucide-react";

export function PermissionDeniedState({
  permission,
  guidance,
}: {
  permission: string;
  guidance?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-10 text-center">
      <ShieldAlert className="h-8 w-8 text-amber-500" aria-hidden="true" />
      <div>
        <p className="font-medium">{permission} access was denied</p>
        <p className="mt-1 text-sm text-muted">
          {guidance ??
            "You can turn this on again from your browser's site settings, then reload this page."}
        </p>
      </div>
    </div>
  );
}
