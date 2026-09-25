import Link from "next/link";

export function Footer() {
  return (
    <footer className="hidden border-t border-border/70 bg-surface-2/40 md:block">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-2 px-6 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <p>ASSURED — Your safety assurance.</p>
        <div className="flex gap-4">
          <Link href="/helplines/national" className="hover:text-foreground">
            Sources &amp; Verification
          </Link>
          <Link href="/emergency/quick" className="hover:text-foreground">
            Quick Emergency page
          </Link>
          <Link href="/settings" className="hover:text-foreground">
            Settings
          </Link>
        </div>
      </div>
    </footer>
  );
}
