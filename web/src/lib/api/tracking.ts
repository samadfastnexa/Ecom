import { apiFetch } from "./client";
import type {
  OffsetPaginated,
  RiderLocation,
  RiderTrailPoint,
  TrackingConfig,
} from "../types";

export interface TrailQuery {
  /** 'YYYY-MM-DD' — a whole local (Asia/Karachi) day. Wins over `since`. */
  date?: string;
  /** ISO timestamp, inclusive lower bound. Ignored when `date` is set. */
  since?: string;
  limit?: number;
  offset?: number;
}

function buildTrailQuery(query: TrailQuery = {}): string {
  const sp = new URLSearchParams();
  if (query.date) sp.set("date", query.date);
  // The backend ignores `since` whenever `date` is present; sending both is
  // just noise in the request log.
  else if (query.since) sp.set("since", query.since);
  if (query.limit !== undefined) sp.set("limit", String(query.limit));
  if (query.offset !== undefined) sp.set("offset", String(query.offset));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const trackingApi = {
  /**
   * Every rider that has ever reported a position, freshest first. Riders who
   * have never reported are absent entirely — which is not the same as stale.
   */
  riderLocations(limit = 500): Promise<OffsetPaginated<RiderLocation>> {
    return apiFetch<OffsetPaginated<RiderLocation>>(
      `/auth/admin/riders/locations/?limit=${limit}`,
      { auth: true }
    );
  },

  /**
   * Breadcrumb trail for one rider, oldest → newest so `results` maps straight
   * onto a polyline path. `userId` is the Django User id (`rider_id` on a
   * RiderLocation), NOT the UserProfile id the rest of ridersApi uses.
   */
  riderTrail(
    userId: number,
    query: TrailQuery = {}
  ): Promise<OffsetPaginated<RiderTrailPoint>> {
    return apiFetch<OffsetPaginated<RiderTrailPoint>>(
      `/auth/admin/riders/${userId}/trail/${buildTrailQuery(query)}`,
      { auth: true }
    );
  },

  config(): Promise<TrackingConfig> {
    return apiFetch<TrackingConfig>("/auth/tracking-config/", { auth: true });
  },
};
