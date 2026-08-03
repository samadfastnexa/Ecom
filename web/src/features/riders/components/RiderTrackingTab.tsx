"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  Route,
  SatelliteDish,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import type { RiderLocation, RiderProfile } from "@/lib/types";
import { Card, LoadingState } from "@/components/ui";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import {
  DEFAULT_STALE_AFTER_MINUTES,
  FRESHNESS,
  OFFLINE_AFTER_MINUTES,
  type Freshness,
} from "../freshness";
import {
  useRiderLocations,
  useRiderTrail,
  useTrackingConfig,
} from "../hooks/useRiderTracking";
import { RiderLocationList } from "./RiderLocationList";

/**
 * Riders ping on their own schedule (TrackingSettings.ping_interval_seconds,
 * 60s by default), so polling much faster than this only burns requests.
 */
const POLL_INTERVAL_MS = 15_000;

/**
 * The Maps SDK reaches for `window` while it loads. Under `output: "export"`
 * every page is prerendered on Node at build time, so importing this eagerly
 * fails the build rather than just the browser — hence ssr:false. It also keeps
 * the SDK out of the bundle until an operator actually opens this tab.
 */
const RiderMapCanvas = dynamic(
  () => import("./RiderMapCanvas").then((m) => m.RiderMapCanvas),
  {
    ssr: false,
    loading: () => <LoadingState message="Loading map…" />,
  }
);

// ─── Toolbar pieces ───────────────────────────────────────────────────────────

/**
 * Kept as its own component so its once-a-second re-render stays local — if it
 * lived in the tab body it would re-render the whole map subtree every tick.
 */
function LastUpdated({ at, paused }: { at: number | null; paused: boolean }) {
  const [, setTick] = useState(0);
  useAutoRefresh(() => setTick((t) => t + 1), 1000);

  if (at === null) return null;
  const seconds = Math.max(0, Math.round((Date.now() - at) / 1000));

  return (
    <span className="flex items-center gap-1.5 text-xs text-mist/50">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          paused ? "bg-amber-400" : "animate-pulse bg-emerald-400"
        )}
        aria-hidden="true"
      />
      {paused ? "Paused · " : ""}updated {seconds}s ago
    </span>
  );
}

function FreshnessLegend({ staleAfterMinutes }: { staleAfterMinutes: number }) {
  const hints: Record<Freshness, string> = {
    live: `under ${staleAfterMinutes} min`,
    stale: `${staleAfterMinutes}–${OFFLINE_AFTER_MINUTES} min`,
    offline: `over ${OFFLINE_AFTER_MINUTES} min`,
  };

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-mist/50">
      {(Object.keys(FRESHNESS) as Freshness[]).map((key) => (
        <span key={key} className="flex items-center gap-1.5">
          <span
            className={cn("h-2 w-2 rounded-full", FRESHNESS[key].dot)}
            aria-hidden="true"
          />
          {FRESHNESS[key].label}
          <span className="text-mist/30">({hints[key]})</span>
        </span>
      ))}
    </div>
  );
}

function ToolbarButton({
  onClick,
  active = false,
  disabled = false,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  icon: typeof RefreshCw;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        active
          ? "bg-wave-gradient text-white shadow-glow"
          : "border border-white/10 bg-white/5 text-mist/70 hover:bg-white/10"
      )}
    >
      <Icon size={15} /> {label}
    </button>
  );
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

interface RiderTrackingTabProps {
  /** The roster, used to resolve a location's profile_id back to a profile. */
  riders: RiderProfile[];
  onOpenRider: (rider: RiderProfile) => void;
}

export function RiderTrackingTab({ riders, onOpenRider }: RiderTrackingTabProps) {
  const locations = useRiderLocations();
  const config = useTrackingConfig();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  // Nonces rather than booleans: the operator can ask for the same rider or the
  // same refit twice in a row and still expect the camera to move.
  const [focusNonce, setFocusNonce] = useState(0);
  const [fitNonce, setFitNonce] = useState(0);

  // A 0 interval makes useAutoRefresh tear its timer down, so pausing genuinely
  // stops the clock rather than hiding a still-running one.
  useAutoRefresh(() => locations.reload(), paused ? 0 : POLL_INTERVAL_MS);

  useEffect(() => {
    if (locations.data) setUpdatedAt(Date.now());
  }, [locations.data]);

  const trail = useRiderTrail(showTrail && selectedId ? selectedId : null);

  const staleAfterMinutes =
    config.data?.stale_after_minutes ?? DEFAULT_STALE_AFTER_MINUTES;
  const riderLocations = useMemo(
    () => locations.data?.results ?? [],
    [locations.data]
  );

  // `profile_id` is the UserProfile id, which is what RiderProfile.id holds —
  // `rider_id` is the auth User id and would silently match the wrong person.
  const profileById = useMemo(() => {
    const byId = new Map<number, RiderProfile>();
    riders.forEach((r) => byId.set(r.id, r));
    return byId;
  }, [riders]);

  const canViewDetails = (rider: RiderLocation) =>
    profileById.has(rider.profile_id);

  const viewDetails = (rider: RiderLocation) => {
    const profile = profileById.get(rider.profile_id);
    if (profile) onOpenRider(profile);
  };

  const focusRider = (riderId: number) => {
    setSelectedId(riderId);
    setFocusNonce((n) => n + 1);
  };

  const hasKey = Boolean(GOOGLE_MAPS_API_KEY);

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LastUpdated at={updatedAt} paused={paused} />
          <FreshnessLegend staleAfterMinutes={staleAfterMinutes} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ToolbarButton
            onClick={() => setShowTrail((s) => !s)}
            active={showTrail}
            disabled={!hasKey}
            label="Today's trail"
            icon={Route}
          />
          <ToolbarButton
            onClick={() => setFitNonce((n) => n + 1)}
            disabled={!hasKey || riderLocations.length === 0}
            label="Fit all"
            icon={Maximize2}
          />
          <ToolbarButton
            onClick={() => locations.reload()}
            label="Refresh"
            icon={RefreshCw}
          />
          <ToolbarButton
            onClick={() => setPaused((p) => !p)}
            active={paused}
            label={paused ? "Resume" : "Pause"}
            icon={paused ? Play : Pause}
          />
        </div>
      </Card>

      {/* Reporting can be switched off server-side; without this the map just
          looks broken rather than intentionally idle. */}
      {config.data && !config.data.tracking_enabled && (
        <Card className="flex items-start gap-3 border-amber-400/30 p-4 text-sm text-amber-200">
          <SatelliteDish size={18} className="mt-0.5 shrink-0" />
          <p>
            Location tracking is switched off in the backend, so these pins will
            not update. Re-enable it under Tracking settings in the Django admin.
          </p>
        </Card>
      )}

      {!hasKey && (
        <Card className="flex items-start gap-3 border-amber-400/30 p-4 text-sm text-amber-200">
          <KeyRound size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Map key not configured</p>
            <p className="mt-1 text-amber-200/80">
              Set <code className="text-amber-100">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code>{" "}
              and rebuild to show the map. Live rider positions are listed below
              in the meantime.
            </p>
          </div>
        </Card>
      )}

      {showTrail && !selectedId && hasKey && (
        <p className="text-xs text-mist/40">
          Pick a rider to draw their trail for today.
        </p>
      )}

      <div
        className={cn(
          "grid gap-4",
          hasKey && "lg:grid-cols-[minmax(0,1fr)_320px]"
        )}
      >
        {hasKey && (
          // Deliberately not a <Card>: every glass surface in the admin carries
          // backdrop-blur, and blurring over a live map canvas cripples
          // compositing performance in Chrome.
          <div className="relative h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a1a2b] lg:h-[620px]">
            {locations.loading && !locations.data ? (
              <LoadingState message="Loading riders…" />
            ) : (
              <RiderMapCanvas
                riders={riderLocations}
                staleAfterMinutes={staleAfterMinutes}
                selectedId={selectedId}
                focusNonce={focusNonce}
                fitNonce={fitNonce}
                trail={trail.data?.results ?? null}
                onSelect={setSelectedId}
                onViewDetails={viewDetails}
                canViewDetails={canViewDetails}
              />
            )}
          </div>
        )}

        <div
          className={cn(
            "flex flex-col gap-2",
            hasKey && "lg:max-h-[620px] lg:overflow-y-auto lg:pr-1"
          )}
        >
          <RiderLocationList
            riders={riderLocations}
            staleAfterMinutes={staleAfterMinutes}
            selectedId={selectedId}
            loading={locations.loading && !locations.data}
            error={locations.error}
            onSelect={focusRider}
            onViewDetails={viewDetails}
            canViewDetails={canViewDetails}
          />
        </div>
      </div>
    </div>
  );
}
