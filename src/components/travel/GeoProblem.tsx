import { LocateOff } from "lucide-react";
import { PermissionDeniedState } from "@/components/states/PermissionDeniedState";
import { UnsupportedBrowserState } from "@/components/states/UnsupportedBrowserState";
import { isIOS, type GeoState } from "@/lib/travel/client";

// No web page — including one added to the iOS Home Screen — can open the iOS
// Settings app or flip Location Services on by itself; Apple doesn't expose
// that to JavaScript. This is the closest thing to "force it on": the exact
// path, instead of generic browser wording that doesn't apply on iPhone.
const DENIED_GUIDANCE_IOS =
  "ASSURED can't see your location. On iPhone/iPad: open Settings → Privacy & Security → Location Services and turn it on, then scroll down to Safari Websites (or, if you added ASSURED to your Home Screen, find ASSURED in the Settings app list) and set it to \"Ask\" or \"While Using the App\". Then come back here and try again.";
const DENIED_GUIDANCE_DEFAULT =
  "ASSURED can't see your location. To use this, allow Location for this site in your browser's site settings (usually the lock or tune icon next to the address), then reload the page.";

/** One place that explains every way location can fail. Renders nothing when there's no problem. */
export function GeoProblem({ state, onRetry }: { state: GeoState; onRetry?: () => void }) {
  if (state === "unsupported") return <UnsupportedBrowserState feature="Location" />;
  if (state === "denied") {
    return (
      <div className="space-y-3">
        <PermissionDeniedState permission="Location" guidance={isIOS() ? DENIED_GUIDANCE_IOS : DENIED_GUIDANCE_DEFAULT} />
        {onRetry && (
          <div className="flex justify-center">
            <button type="button" onClick={onRetry} className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-2">
              I&apos;ve checked Settings — try again
            </button>
          </div>
        )}
      </div>
    );
  }
  if (state !== "insecure" && state !== "unavailable" && state !== "timeout") return null;
  const msg =
    state === "insecure"
      ? "Location only works on a secure (https) connection."
      : state === "timeout"
        ? "Finding your location took too long. Move to a spot with a clearer view of the sky, or check your connection, then try again."
        : isIOS()
          ? "Your iPhone couldn't work out where it is. Check Settings → Privacy & Security → Location Services is turned on for this device, then try again."
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
