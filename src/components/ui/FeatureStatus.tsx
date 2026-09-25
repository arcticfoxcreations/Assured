import type { FeatureStatus as FeatureStatusType } from "@/types/common";
import { cn } from "@/lib/utils";

const config: Record<
  FeatureStatusType,
  { label: string; classes: string }
> = {
  available: {
    label: "Available now",
    classes: "bg-safe/10 text-safe border-safe/30",
  },
  "coming-later": {
    label: "Coming in a later part",
    classes: "bg-surface-2 text-muted border-border",
  },
  "browser-limit": {
    label: "Browser limitation",
    classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
  },
};

export function FeatureStatusBadge({
  status,
  className,
}: {
  status: FeatureStatusType;
  className?: string;
}) {
  const c = config[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        c.classes,
        className
      )}
    >
      {c.label}
    </span>
  );
}
