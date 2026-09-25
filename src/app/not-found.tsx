import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 px-4 py-20 text-center">
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">
        404
      </p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-sm text-muted">
        The page you were looking for doesn&apos;t exist. If you followed a
        link to get here, it may be outdated.
      </p>
      <div className="mt-2 flex gap-3">
        <Button href="/">Go to Home</Button>
        <Button href="/emergency" variant="secondary">
          Emergency
        </Button>
      </div>
    </div>
  );
}
