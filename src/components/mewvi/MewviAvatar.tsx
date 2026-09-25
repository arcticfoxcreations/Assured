import { PawPrint } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small CSS-only cat-eared badge standing in for a Mewvi mascot image.
 * No mascot artwork has been supplied yet (see ASSET_CHECKLIST.md) — this
 * gives Mewvi a distinct, recognisable silhouette without inventing brand
 * artwork. Swap the two "ear" spans + <PawPrint> for a real <Image> once
 * mascot assets exist; the sizing/position props can stay as-is.
 */
export function MewviAvatar({ size = 36, online = false, className }: { size?: number; online?: boolean; className?: string }) {
  const ear = size * 0.34;
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }} aria-hidden="true">
      <span
        className="absolute rounded-tl-full bg-gradient-to-br from-primary to-primary/70"
        style={{ width: ear, height: ear, left: -ear * 0.12, top: -ear * 0.32, transform: "rotate(-18deg)" }}
      />
      <span
        className="absolute rounded-tr-full bg-gradient-to-bl from-primary to-primary/70"
        style={{ width: ear, height: ear, right: -ear * 0.12, top: -ear * 0.32, transform: "rotate(18deg)" }}
      />
      <span className="relative flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-soft">
        <PawPrint style={{ width: size * 0.5, height: size * 0.5 }} />
      </span>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping-slow rounded-full bg-safe" />
          <span className="relative inline-flex h-3 w-3 rounded-full border-2 border-surface bg-safe" />
        </span>
      )}
    </span>
  );
}
