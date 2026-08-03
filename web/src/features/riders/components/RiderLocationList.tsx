"use client";

import { ChevronRight, MapPin, Package } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, Chip, LoadingRows } from "@/components/ui";
import type { RiderLocation } from "@/lib/types";
import { FRESHNESS, formatAgo, freshnessOf } from "../freshness";

interface RiderLocationListProps {
  riders: RiderLocation[];
  staleAfterMinutes: number;
  selectedId: number | null;
  loading: boolean;
  error: string | null;
  /** Pans the map to this rider. Also the row's primary action without a map. */
  onSelect: (riderId: number) => void;
  onViewDetails: (rider: RiderLocation) => void;
  canViewDetails: (rider: RiderLocation) => boolean;
}

export function RiderLocationList({
  riders,
  staleAfterMinutes,
  selectedId,
  loading,
  error,
  onSelect,
  onViewDetails,
  canViewDetails,
}: RiderLocationListProps) {
  if (loading) return <LoadingRows rows={5} />;

  if (error)
    return (
      <Card className="border-rose-400/30 p-6 text-center text-rose-200">
        {error}
      </Card>
    );

  if (riders.length === 0)
    return (
      <Card className="p-12 text-center text-mist/40">
        <MapPin size={36} className="mx-auto mb-3 opacity-30" />
        <p className="text-sm">
          No rider has reported a position yet. Positions appear here once the
          rider app has been installed and location permission granted.
        </p>
      </Card>
    );

  return (
    <div className="flex flex-col gap-2">
      {riders.map((rider) => {
        const freshness = freshnessOf(rider, staleAfterMinutes);
        const style = FRESHNESS[freshness];
        const selected = selectedId === rider.rider_id;
        const hasProfile = canViewDetails(rider);

        return (
          <div
            key={rider.rider_id}
            className={cn(
              "flex items-stretch gap-1 rounded-xl border p-1 transition",
              selected
                ? "border-wave/60 bg-wave/10"
                : "border-white/10 bg-white/5 hover:bg-white/10"
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(rider.rider_id)}
              className="flex min-w-0 flex-1 flex-col gap-1 rounded-lg px-2 py-1.5 text-left"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn("h-2 w-2 shrink-0 rounded-full", style.dot)}
                  aria-hidden="true"
                />
                <span className="truncate text-sm font-semibold text-mist">
                  {rider.name}
                </span>
                <Chip className={cn("ml-auto shrink-0 !px-2 !py-0.5", style.chip)}>
                  {formatAgo(rider.minutes_ago)}
                </Chip>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-4 text-xs text-mist/50">
                {rider.phone && <span>{rider.phone}</span>}
                {rider.vehicle_number && <span>{rider.vehicle_number}</span>}
                <span className="flex items-center gap-1">
                  <Package size={12} /> {rider.active_orders}
                </span>
                {rider.battery_level !== null && (
                  <span>{rider.battery_level}%</span>
                )}
              </div>
            </button>

            <button
              type="button"
              onClick={() => onViewDetails(rider)}
              disabled={!hasProfile}
              title={
                hasProfile
                  ? `Open ${rider.name}'s profile`
                  : "Profile not in the current rider list"
              }
              aria-label={`Open ${rider.name}'s profile`}
              className="flex w-8 shrink-0 items-center justify-center rounded-lg text-mist/40 transition hover:bg-white/10 hover:text-wave disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-mist/40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
