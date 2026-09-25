"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/states/ErrorState";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Intentionally no sensitive data logged.
    console.error("ASSURED route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <ErrorState onRetry={reset} />
    </div>
  );
}
