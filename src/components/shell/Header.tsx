"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { headerNavRoutes } from "@/lib/navigation";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Logo } from "@/components/shell/Logo";
import { cn } from "@/lib/utils";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 hidden border-b border-border/70 bg-surface/75 backdrop-blur-lg md:block">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Logo size={26} />
          <span>ASSURED</span>
        </Link>

        <nav aria-label="Primary" className="flex items-center gap-1">
          {headerNavRoutes
            .filter((r) => r.id !== "home")
            .map((r) => {
              const active = pathname === r.href;
              return (
                <Link
                  key={r.id}
                  href={r.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-surface-2 text-foreground"
                      : "text-muted hover:text-foreground"
                  )}
                >
                  {r.shortLabel ?? r.label}
                </Link>
              );
            })}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/emergency"
            className="rounded-xl bg-emergency px-4 py-2 text-sm font-semibold text-emergency-foreground shadow-glow transition-all duration-200 ease-calm hover:-translate-y-0.5 hover:opacity-95"
          >
            SOS
          </Link>
        </div>
      </div>
    </header>
  );
}
