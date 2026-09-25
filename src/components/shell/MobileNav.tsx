"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Siren, FileText, Compass, Menu, X } from "lucide-react";
import { bottomNavRoutes, navGroups, routesInGroup } from "@/lib/navigation";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { cn } from "@/lib/utils";

const icons: Record<string, React.ElementType> = {
  home: Home,
  emergency: Siren,
  report: FileText,
  travel: Compass,
};

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const primary = bottomNavRoutes;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-label="More ASSURED pages"
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 rounded-t-3xl border-t border-border/70 bg-surface md:hidden",
          "transition-transform duration-200",
          open ? "translate-y-0" : "translate-y-full pointer-events-none"
        )}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold">More</p>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={() => setOpen(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-surface-2"
              aria-label="Close"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-4 py-3">
          {navGroups.map((group) => (
            <div key={group.id} className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              <ul className="grid grid-cols-2 gap-2">
                {routesInGroup(group.id).map((r) => (
                  <li key={r.id}>
                    <Link
                      href={r.href}
                      onClick={() => setOpen(false)}
                      className="block rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-surface-2"
                    >
                      {r.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/90 backdrop-blur-lg md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <ul className="grid grid-cols-5">
          {primary.map((r) => {
            const Icon = icons[r.id] ?? Home;
            const active = pathname === r.href;
            const isEmergency = r.id === "emergency";
            return (
              <li key={r.id}>
                <Link
                  href={r.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium",
                    isEmergency
                      ? "text-emergency"
                      : active
                      ? "text-primary"
                      : "text-muted"
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {r.shortLabel ?? r.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              onClick={() => setOpen(true)}
              aria-expanded={open}
              className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
