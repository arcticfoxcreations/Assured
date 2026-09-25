"use client";

import { useEffect } from "react";
import "./globals.css";

/**
 * Next.js App Router requires a SEPARATE global-error.tsx to catch errors
 * thrown by the root layout itself (ThemeProvider / AppShell / Header /
 * Footer / MobileNav / MewviLauncher all render inside app/layout.tsx).
 * The regular src/app/error.tsx ONLY protects page.tsx content — it does
 * NOT protect the root layout that wraps it. Without this file, any error
 * thrown while the root layout is mounting/unmounting shows the browser's
 * raw, unstyled "Application error: a client-side exception has occurred"
 * screen instead of a normal, recoverable ASSURED error screen. This file
 * must define its own <html> and <body> because it fully replaces the
 * root layout when it renders.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Intentionally no sensitive data logged.
    console.error("ASSURED root error:", error.digest ?? error.message);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-10 text-center">
            <p className="font-medium">Something went wrong</p>
            <p className="text-sm text-muted">
              ASSURED hit an unexpected error. Please try again — if it keeps
              happening, reloading the page usually clears it.
            </p>
            <button
              onClick={reset}
              className="mt-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
