import Link from "next/link";
import {
  ListChecks,
  PhoneCall,
  ExternalLink,
  ClipboardList,
  FolderLock,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { ReportGuideFull } from "@/lib/reportGuides";
import { nationalHelplines, telHref, isDialable, getSource } from "@/lib/helplines";

const sections: {
  key: keyof Pick<
    ReportGuideFull,
    | "whatToDoNow"
    | "whoToContact"
    | "whereToReport"
    | "whatInformationToKeep"
    | "whatEvidenceToPreserve"
  >;
  title: string;
  icon: React.ElementType;
}[] = [
  { key: "whatToDoNow", title: "What to do now", icon: ListChecks },
  { key: "whoToContact", title: "Who to contact", icon: PhoneCall },
  { key: "whereToReport", title: "Where to report", icon: ExternalLink },
  { key: "whatInformationToKeep", title: "What information to keep", icon: ClipboardList },
  { key: "whatEvidenceToPreserve", title: "What evidence to preserve", icon: FolderLock },
];

export function ReportGuideView({ guide }: { guide: ReportGuideFull }) {
  const relevantHelplines = nationalHelplines.filter((h) =>
    guide.helplineIds.includes(h.id)
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">{guide.summary}</p>

      {sections.map(({ key, title, icon: Icon }) => {
        const items = guide[key];
        if (!Array.isArray(items) || items.length === 0) return null;
        return (
          <Card key={key}>
            <div className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
              <p className="font-medium">{title}</p>
            </div>
            <ul className="mt-2 space-y-1.5 text-sm text-muted">
              {items.map((it) => (
                <li key={it} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                  <span>{it}</span>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}

      {relevantHelplines.length > 0 && (
        <Card>
          <p className="font-medium">Relevant helplines</p>
          <div className="mt-3 space-y-2">
            {relevantHelplines.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{h.name}</p>
                  <p className="text-xs text-muted">{h.number}</p>
                </div>
                {isDialable(h) && (
                  <Button href={telHref(h.number)} size="sm" variant="primary">
                    <PhoneCall className="h-3.5 w-3.5" aria-hidden="true" />
                    Call
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {guide.officialLinks.length > 0 && (
        <Card>
          <p className="font-medium">Official channels</p>
          <div className="mt-2 space-y-2">
            {guide.officialLinks.map((l) => {
              const source = getSource(l.sourceId);
              return (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm hover:bg-surface-2"
                >
                  <span>
                    <span className="block font-medium">{l.label}</span>
                    {source && (
                      <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted">
                        <ShieldCheck className="h-3 w-3 text-safe" aria-hidden="true" />
                        {source.publisher}
                      </span>
                    )}
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                </a>
              );
            })}
          </div>
        </Card>
      )}

      <p className="text-xs text-muted">
        ASSURED never submits this report to an authority on your behalf —
        every &quot;where to report&quot; link goes to the real official
        channel, which you complete yourself.
      </p>

      {guide.relatedRoutes.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {guide.relatedRoutes.includes("evidence") && (
            <Link
              href="/evidence"
              className="text-sm font-medium text-primary hover:underline"
            >
              Organize evidence →
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
