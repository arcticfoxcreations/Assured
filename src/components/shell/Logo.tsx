import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The real ASSURED mark (heart / family / open hand) — not a stand-in icon.
 * Two pre-exported transparent PNGs (dark ink for light mode, light sage
 * ink for dark mode) are swapped purely with the `dark:` CSS class the
 * no-flash theme script sets on <html> before hydration, so there is no
 * client-side flicker or mismatch.
 */
export function Logo({ className, size = 28 }: { className?: string; size?: number }) {
  return (
    <span className={cn("relative inline-block shrink-0", className)} style={{ width: size, height: size }}>
      <Image
        src="/assets/logos/assured-mark.png"
        alt="ASSURED"
        fill
        sizes={`${size}px`}
        priority
        className="object-contain dark:hidden"
      />
      <Image
        src="/assets/logos/assured-mark-dark.png"
        alt="ASSURED"
        fill
        sizes={`${size}px`}
        priority
        className="hidden object-contain dark:block"
      />
    </span>
  );
}
