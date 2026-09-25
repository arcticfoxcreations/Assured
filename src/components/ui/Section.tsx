import { cn } from "@/lib/utils";

export function Section({
  title,
  description,
  className,
  children,
}: {
  title?: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-2xl px-4 py-6", className)}>
      {title && (
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      )}
      {description && (
        <p className="mt-1 text-sm text-muted">{description}</p>
      )}
      <div className={title || description ? "mt-4" : undefined}>
        {children}
      </div>
    </section>
  );
}
