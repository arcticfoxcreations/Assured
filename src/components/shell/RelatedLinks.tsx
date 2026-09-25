import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getRoute, relatedRoutes } from "@/lib/navigation";

export function RelatedLinks({ routeId }: { routeId: string }) {
  const ids = relatedRoutes[routeId];
  if (!ids || ids.length === 0) return null;

  return (
    <nav
      aria-label="Related ASSURED pages"
      className="mx-auto w-full max-w-2xl px-4 pb-10"
    >
      <h2 className="text-sm font-semibold text-muted">Related</h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {ids.map((id) => {
          const r = getRoute(id);
          if (!r) return null;
          return (
            <li key={id}>
              <Link
                href={r.href}
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 py-3 text-sm transition-colors hover:bg-surface-2"
              >
                <span>
                  <span className="block font-medium">{r.label}</span>
                  <span className="block text-xs text-muted">
                    {r.description}
                  </span>
                </span>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
