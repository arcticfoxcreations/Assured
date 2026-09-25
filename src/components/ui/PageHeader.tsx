import { Breadcrumbs } from "@/components/shell/Breadcrumbs";

export function PageHeader({
  routeId,
  title,
  description,
  eyebrow,
  actions,
}: {
  routeId: string;
  title: string;
  description: string;
  eyebrow?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="border-b border-border/70 bg-surface-2/40">
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <Breadcrumbs routeId={routeId} />
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pb-6 pt-2">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[28px]">
          {title}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {description}
        </p>
        {actions && <div className="mt-4 flex flex-wrap gap-3">{actions}</div>}
      </div>
    </header>
  );
}
