"use client";

import { Phone, Copy, ExternalLink, Check, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { Helpline } from "@/types/helpline";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { isDialable, telHref, getSource } from "@/lib/helplines";

export function HelplineCard({ helpline }: { helpline: Helpline }) {
  const [copied, setCopied] = useState(false);
  const dialable = isDialable(helpline);
  const source = getSource(helpline.sourceId);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(helpline.number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API can fail without permission; number is still visible.
    }
  }

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{helpline.name}</p>
          <p
            className={
              dialable
                ? "mt-1 text-xl font-semibold tracking-tight"
                : "mt-1 text-sm font-medium text-muted"
            }
          >
            {helpline.number}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {helpline.category.slice(0, 2).map((c) => (
            <span
              key={c}
              className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted"
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      <p className="mt-2 text-sm text-muted">{helpline.description}</p>
      <p className="mt-1 text-xs text-muted">Availability: {helpline.availability}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {dialable && (
          <Button href={telHref(helpline.number)} size="sm" variant="primary">
            <Phone className="h-3.5 w-3.5" aria-hidden="true" />
            Call
          </Button>
        )}
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy"}
        </Button>
        {helpline.website && (
          <Button
            href={helpline.website}
            size="sm"
            variant="ghost"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            Website
          </Button>
        )}
      </div>

      {source && (
        <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-2 text-[11px] text-muted">
          <ShieldCheck className="h-3 w-3 shrink-0 text-safe" aria-hidden="true" />
          <span>
            Verified against {source.publisher} · {helpline.verifiedOn}
          </span>
        </div>
      )}
    </Card>
  );
}
