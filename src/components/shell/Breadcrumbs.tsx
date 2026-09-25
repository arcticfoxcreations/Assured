import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getRoute, navGroups } from "@/lib/navigation";

export function Breadcrumbs({ routeId }: { routeId: string }) {
  const route = getRoute(routeId);
  if (!route || routeId === "home") return null;

  const group = navGroups.find((g) => g.id === route.group);

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-muted">
      <Link href="/" className="hover:text-foreground">
        Home
      </Link>
      {group && (
        <>
          <ChevronRight className="h-3 w-3" aria-hidden="true" />
          <span>{group.label}</span>
        </>
      )}
      <ChevronRight className="h-3 w-3" aria-hidden="true" />
      <span aria-current="page" className="text-foreground">
        {route.label}
      </span>
    </nav>
  );
}
