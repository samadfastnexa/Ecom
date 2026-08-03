"use client";

import { useAsync } from "@/hooks/useAsync";
import { trackingApi } from "@/lib/api/tracking";
import type { OffsetPaginated, RiderTrailPoint } from "@/lib/types";
import { todayParam } from "../freshness";

export function useRiderLocations() {
  return useAsync(() => trackingApi.riderLocations(), []);
}

export function useTrackingConfig() {
  return useAsync(() => trackingApi.config(), []);
}

/**
 * Today's breadcrumb trail for one rider. `userId` is the Django User id
 * (`rider_id`), not the UserProfile id. Null while the trail is switched off,
 * so opening the map doesn't pull ~1,440 points nobody asked for.
 */
export function useRiderTrail(userId: number | null) {
  return useAsync<OffsetPaginated<RiderTrailPoint> | null>(
    () =>
      userId
        ? trackingApi.riderTrail(userId, { date: todayParam(), limit: 2000 })
        : Promise.resolve(null),
    [userId]
  );
}
