import { LocateOff } from "lucide-react";
import { PermissionDeniedState } from "@/components/states/PermissionDeniedState";
import { UnsupportedBrowserState } from "@/components/states/UnsupportedBrowserState";
import { isIOS, type GeoState } from "@/lib/travel/client";

/** One place that explains every way location can fail. Renders nothing when there's no problem. */
export function GeoProblem({ state, onRetry }: { state: GeoState; onRetry?: () => void }) {
  if (state === "unsupported") return <UnsupportedBrowserState feature="Location" />;
  if (state === "denied") {
    return (
      <PermissionDeniedState
        permission="Location"
        guidance={
          isIOS()
            ? "ASSURED can't see your location. On iPhone/iPad: open Settings → Privacy & Security → Location Services, make sure it's on, then find your browser (Safari or Chrome) in the list and set it to \"While Using the App\". Reload this page afterwards."
            : "ASSURED can't see your location. To use this, allow Location for this site in your browser's site settings (usually the lock or tune icon next to the address), then reload the page."
        }
      />
    );
  }
  if (state !== "insecure" && state !== "unavailable" && state !== "timeout") return null;
  const msg =
    state === "insecure"
      ? "Location only works on a secure (https) connection."
      : state === "timeout"
        ? "Finding your location took too long. Move to a spot with a clearer view of the sky, or check your connection, then try again."
        : "Your device couldn't work out where it is. Check that Location / GPS is switched on in your phone's settings, then try again.";
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface-2/40 px-6 py-10 text-center">
      <LocateOff className="h-8 w-8 text-amber-500" aria-hidden="true" />
      <div>
        <p className="font-medium">Location isn&apos;t available</p>
        <p className="mt-1 text-sm text-muted">{msg}</p>
      </div>
      {onRetry && state !== "insecure" && (
        <button type="button" onClick={onRetry} className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-2">Try again</button>
      )}
    </div>
  );
}
