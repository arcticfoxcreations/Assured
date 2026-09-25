import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-surface p-4 shadow-card transition-all duration-200 ease-calm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
