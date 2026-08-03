import type { RiderLocation } from "@/lib/types";

export type Freshness = "live" | "stale" | "offline";

/**
 * Past this, a rider isn't lagging — they've stopped reporting altogether
 * (app killed, phone off, no signal). Worth showing differently from someone
 * who is merely a few minutes behind, because the operator's response differs:
 * a stale pin is still roughly right, an offline one may be hours wrong.
 */
export const OFFLINE_AFTER_MINUTES = 60;

/** Fallback for the stale cutoff until /auth/tracking-config/ answers. */
export const DEFAULT_STALE_AFTER_MINUTES = 10;

/**
 * `staleAfterMinutes` comes from the server's tracking config rather than a
 * constant here, so raising it in Django admin moves the map's colouring too.
 * `minutes_ago` is the server's own figure against the same `recorded_at` the
 * server used for `is_stale`, so the two can never disagree — deriving it from
 * the browser clock instead would drift by whatever the operator's PC is off by.
 */
export function freshnessOf(
  rider: RiderLocation,
  staleAfterMinutes: number
): Freshness {
  if (rider.minutes_ago >= OFFLINE_AFTER_MINUTES) return "offline";
  if (rider.is_stale || rider.minutes_ago >= staleAfterMinutes) return "stale";
  return "live";
}

interface FreshnessStyle {
  label: string;
  /** Marker fill — an SVG symbol needs a real colour, not a Tailwind class. */
  hex: string;
  chip: string;
  dot: string;
}

export const FRESHNESS: Record<Freshness, FreshnessStyle> = {
  live: {
    label: "Live",
    hex: "#34d399",
    chip: "bg-emerald-400/15 text-emerald-300",
    dot: "bg-emerald-400",
  },
  stale: {
    label: "Stale",
    hex: "#fbbf24",
    chip: "bg-amber-400/15 text-amber-300",
    dot: "bg-amber-400",
  },
  offline: {
    label: "Offline",
    hex: "#94a3b8",
    chip: "bg-white/10 text-mist/50",
    dot: "bg-mist/40",
  },
};

/** "3 min ago" from the server's fractional minutes. */
export function formatAgo(minutes: number): string {
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${Math.round(minutes)} min ago`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

/**
 * Today as 'YYYY-MM-DD' in the browser's own timezone. `toISOString()` would
 * give the UTC date, which in Pakistan (UTC+5) rolls over five hours early and
 * would ask for yesterday's trail all evening.
 */
export function todayParam(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
