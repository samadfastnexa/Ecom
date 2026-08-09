"use client";

import dynamic from "next/dynamic";
import { ExternalLink, MapPin, MapPinOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import { formatCoords, googleMapsUrl, type Coords } from "@/lib/geo";
import { LoadingState } from "@/components/ui";

/**
 * Whether a basemap can render at all.
 *
 * The key is baked in at build time and is empty in every checked-in env file,
 * so treat "no basemap" as the normal case, not an error state: every surface
 * that shows a pin must stay fully usable without one. Callers read this to
 * decide whether to offer map-only affordances (drag the pin) or lean on the
 * coordinate controls instead.
 */
export const MAPS_ENABLED = Boolean(GOOGLE_MAPS_API_KEY);

/** See PinMapCanvas — the Maps SDK cannot be imported during the export build. */
const PinMapCanvas = dynamic(
  () => import("./PinMapCanvas").then((m) => m.PinMapCanvas),
  {
    ssr: false,
    loading: () => <LoadingState message="Loading map…" compact />,
  }
);

interface PinMapProps {
  /** Null renders the "no pin yet" panel instead of a map. */
  coords: Coords | null;
  /** Omit for a read-only view; provide to allow dragging and click-to-set. */
  onPick?: (coords: Coords) => void;
  centerNonce?: number;
  /** Tailwind height for the map surface. */
  heightClass?: string;
  /** Shown inside the panel when there is no pin. */
  emptyHint?: string;
  className?: string;
}

function Panel({
  icon: Icon,
  title,
  hint,
  heightClass,
}: {
  icon: typeof MapPin;
  title: string;
  hint?: string;
  heightClass: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 px-4 text-center",
        heightClass
      )}
    >
      <Icon size={26} className="text-wave/50" />
      <p className="text-sm text-mist/70">{title}</p>
      {hint && <p className="max-w-sm text-xs text-mist/40">{hint}</p>}
    </div>
  );
}

/**
 * The pin, shown as richly as the environment allows.
 *
 * With a Maps key it is an interactive map; without one it degrades to the
 * coordinates plus a Google Maps link, which needs no key and opens the exact
 * spot in the app on a phone. The link is offered in both cases — even with a
 * working basemap, a rider wants turn-by-turn, not a picture.
 */
export function PinMap({
  coords,
  onPick,
  centerNonce,
  heightClass = "h-64",
  emptyHint,
  className,
}: PinMapProps) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {!coords ? (
        <Panel
          icon={MapPinOff}
          title="No delivery pin saved"
          hint={emptyHint}
          heightClass={heightClass}
        />
      ) : MAPS_ENABLED ? (
        <div className={cn("overflow-hidden rounded-xl border border-white/10", heightClass)}>
          <PinMapCanvas coords={coords} onPick={onPick} centerNonce={centerNonce} />
        </div>
      ) : (
        <Panel
          icon={MapPin}
          title={formatCoords(coords)}
          hint="Map preview is unavailable on this build — open the link below to see the exact spot."
          heightClass={heightClass}
        />
      )}

      {coords && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-mist/50">{formatCoords(coords)}</span>
          <a
            href={googleMapsUrl(coords)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 font-medium text-wave transition hover:bg-white/10"
          >
            <ExternalLink size={12} /> Open in Google Maps
          </a>
        </div>
      )}

      {coords && MAPS_ENABLED && onPick && (
        <p className="text-xs text-mist/40">
          Drag the pin or tap the map to move it.
        </p>
      )}
    </div>
  );
}
