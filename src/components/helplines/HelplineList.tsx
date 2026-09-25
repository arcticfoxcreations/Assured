"use client";

import { useMemo, useState } from "react";
import { Search, PhoneOff } from "lucide-react";
import type { Helpline } from "@/types/helpline";
import { HelplineCard } from "@/components/helplines/HelplineCard";
import { filterHelplines, getAllCategories } from "@/lib/helplines";
import { EmptyState } from "@/components/states/EmptyState";
import { cn } from "@/lib/utils";

export function HelplineList({ helplines }: { helplines: Helpline[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const categories = useMemo(() => getAllCategories(), []);
  const results = useMemo(
    () => filterHelplines(helplines, { query, category }),
    [helplines, query, category]
  );

  return (
    <div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5">
        <Search className="h-4 w-4 text-muted" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, category or number"
          className="w-full bg-transparent text-sm outline-none"
          aria-label="Search helplines"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => setCategory(undefined)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium",
            !category
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted hover:text-foreground"
          )}
        >
          All
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c === category ? undefined : c)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
              category === c
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted hover:text-foreground"
            )}
          >
            {c.replace(/-/g, " ")}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {results.length === 0 ? (
          <EmptyState
            icon={PhoneOff}
            title="No matching helplines"
            description="Try a different search term or clear the category filter."
          />
        ) : (
          results.map((h) => <HelplineCard key={h.id} helpline={h} />)
        )}
      </div>
    </div>
  );
}
