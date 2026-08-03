"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  APIProvider,
  InfoWindow,
  Map,
  Marker,
  Polyline,
  useMap,
  useMarkerRef,
} from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import type { RiderLocation, RiderTrailPoint } from "@/lib/types";
import { FRESHNESS, formatAgo, freshnessOf, type Freshness } from "../freshness";

// Lahore — the business's home city, and a sane view for the moment before any
// rider has reported.
const FALLBACK_CENTER = { lat: 31.5204, lng: 74.3587 };
const FALLBACK_ZOOM = 11;
const SINGLE_RIDER_ZOOM = 15;
const FOCUS_ZOOM = 16;
const BOUNDS_PADDING_PX = 64;

/**
 * `styles` is only honoured when the map has NO mapId — cloud-based styling
 * takes over the moment one is set. Keeping mapId unset is deliberate: it means
 * the map works with nothing but an API key, no Cloud console map style or
 * Map ID to create first.
 */
const DARK_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#0a1a2b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#7fa8bd" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#061019" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#0d2b40" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#123449" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#6d94a8" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#1a4a63" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#04121e" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d6d85" }] },
];

/**
 * SVG path strings rather than the `google.maps.SymbolPath` enum, so an icon
 * can be built during render without touching the `google` global — which does
 * not exist until the SDK finishes loading.
 */
const DOT_PATH = "M 0 -7 A 7 7 0 1 0 0 7 A 7 7 0 1 0 0 -7 Z";
const ARROW_PATH = "M 0 -9 L 6.5 8 L 0 4 L -6.5 8 Z";

const TRAIL_COLOR = "#05bfdb";

// ─── Camera ───────────────────────────────────────────────────────────────────

interface CameraProps {
  riders: RiderLocation[];
  focusId: number | null;
  focusNonce: number;
  fitNonce: number;
}

/**
 * Drives the viewport. Rendered as a child of <Map> because `useMap()` only
 * resolves inside it.
 */
function MapCamera({ riders, focusId, focusNonce, fitNonce }: CameraProps) {
  const map = useMap();
  const fittedTo = useRef("");
  const fittedNonce = useRef(fitNonce);

  useEffect(() => {
    if (!map || riders.length === 0) return;

    const key = riders
      .map((r) => r.rider_id)
      .sort((a, b) => a - b)
      .join(",");
    // A poll lands every few seconds. Refitting on each one would snatch the
    // view back mid-pan, so only refit when the fleet changes or "Fit all" is
    // pressed.
    if (key === fittedTo.current && fitNonce === fittedNonce.current) return;
    fittedTo.current = key;
    fittedNonce.current = fitNonce;

    if (riders.length === 1) {
      // fitBounds on a zero-area box zooms to the maximum, putting the operator
      // inside a single building. A street-level zoom is what they meant.
      map.setCenter({ lat: riders[0].latitude, lng: riders[0].longitude });
      map.setZoom(SINGLE_RIDER_ZOOM);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    riders.forEach((r) => bounds.extend({ lat: r.latitude, lng: r.longitude }));
    map.fitBounds(bounds, BOUNDS_PADDING_PX);
  }, [map, riders, fitNonce]);

  useEffect(() => {
    if (!map || focusId === null) return;
    const rider = riders.find((r) => r.rider_id === focusId);
    if (!rider) return;
    map.panTo({ lat: rider.latitude, lng: rider.longitude });
    if ((map.getZoom() ?? 0) < FOCUS_ZOOM) map.setZoom(FOCUS_ZOOM);
    // Deliberately not keyed on `riders`: re-running on every poll would drag
    // the map back to the selected rider while the operator is looking elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, focusId, focusNonce]);

  return null;
}

// ─── Info window body ─────────────────────────────────────────────────────────

/**
 * Google renders the InfoWindow into its own white bubble, outside any themed
 * container, so this one block uses inline dark-on-light styles instead of the
 * app's Tailwind classes — `text-mist` here would be white on white.
 */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ color: "#5b7a8c" }}>{label}</span>
      <span style={{ color: "#0a2231", fontWeight: 500, textAlign: "right" }}>
        {value}
      </span>
    </div>
  );
}

// ─── Marker ───────────────────────────────────────────────────────────────────

interface RiderMarkerProps {
  rider: RiderLocation;
  freshness: Freshness;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onViewDetails: (rider: RiderLocation) => void;
  canViewDetails: boolean;
}

function RiderMarker({
  rider,
  freshness,
  open,
  onOpen,
  onClose,
  onViewDetails,
  canViewDetails,
}: RiderMarkerProps) {
  const [markerRef, marker] = useMarkerRef();
  const { hex, label } = FRESHNESS[freshness];

  const icon = useMemo<google.maps.Symbol>(() => {
    // A moving rider gets an arrow pointing where they're going; a stopped one
    // gets a plain dot, because a heading held over from the last movement
    // would be pointing at a guess.
    if (rider.is_moving && rider.heading !== null) {
      return {
        path: ARROW_PATH,
        rotation: rider.heading,
        scale: 1,
        fillColor: hex,
        fillOpacity: 1,
        strokeColor: "#04121e",
        strokeWeight: 1.5,
      };
    }
    return {
      path: DOT_PATH,
      scale: 1,
      fillColor: hex,
      fillOpacity: 1,
      strokeColor: "#04121e",
      strokeWeight: 2,
    };
  }, [rider.is_moving, rider.heading, hex]);

  return (
    <>
      <Marker
        ref={markerRef}
        position={{ lat: rider.latitude, lng: rider.longitude }}
        icon={icon}
        title={`${rider.name} — ${label}`}
        onClick={onOpen}
        // Keep fresh pins above dead ones where riders overlap at a depot.
        zIndex={open ? 100 : freshness === "live" ? 30 : freshness === "stale" ? 20 : 10}
      />

      {open && marker && (
        <InfoWindow
          anchor={marker}
          onCloseClick={onClose}
          headerContent={
            <span style={{ color: "#0a2231", fontWeight: 700, fontSize: 14 }}>
              {rider.name}
            </span>
          }
        >
          <div
            style={{
              minWidth: 210,
              maxWidth: 260,
              fontSize: 13,
              lineHeight: 1.5,
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
              <span
                style={{
                  width: 9,
                  height: 9,
                  borderRadius: 999,
                  background: hex,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#5b7a8c" }}>
                {label} · {formatAgo(rider.minutes_ago)}
              </span>
            </div>

            <InfoRow label="Phone" value={rider.phone || "—"} />
            <InfoRow label="Vehicle" value={rider.vehicle_number || "—"} />
            <InfoRow label="Active orders" value={String(rider.active_orders)} />
            <InfoRow
              label="Status"
              value={rider.is_available ? "Available" : "Unavailable"}
            />
            {rider.speed_kmh !== null && (
              <InfoRow label="Speed" value={`${Math.round(rider.speed_kmh)} km/h`} />
            )}
            {rider.battery_level !== null && (
              <InfoRow label="Battery" value={`${rider.battery_level}%`} />
            )}
            <InfoRow
              label="Last fix"
              value={new Date(rider.recorded_at).toLocaleTimeString(undefined, {
                hour: "2-digit",
                minute: "2-digit",
              })}
            />

            <button
              type="button"
              onClick={() => onViewDetails(rider)}
              disabled={!canViewDetails}
              style={{
                marginTop: 8,
                width: "100%",
                borderRadius: 8,
                border: "none",
                padding: "7px 10px",
                fontSize: 13,
                fontWeight: 600,
                color: "#ffffff",
                background: canViewDetails ? "#088395" : "#9bb3bf",
                cursor: canViewDetails ? "pointer" : "not-allowed",
              }}
            >
              View details
            </button>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────────

interface RiderMapCanvasProps {
  riders: RiderLocation[];
  staleAfterMinutes: number;
  selectedId: number | null;
  focusNonce: number;
  fitNonce: number;
  trail: RiderTrailPoint[] | null;
  onSelect: (riderId: number | null) => void;
  onViewDetails: (rider: RiderLocation) => void;
  canViewDetails: (rider: RiderLocation) => boolean;
}

/**
 * Never imported directly — RiderTrackingTab pulls it in through next/dynamic
 * with `ssr: false`. The Maps SDK touches `window` as it loads, which would
 * crash `next build`'s prerender pass on a static export.
 */
export function RiderMapCanvas({
  riders,
  staleAfterMinutes,
  selectedId,
  focusNonce,
  fitNonce,
  trail,
  onSelect,
  onViewDetails,
  canViewDetails,
}: RiderMapCanvasProps) {
  const trailPath = useMemo(
    () => trail?.map((p) => ({ lat: p.latitude, lng: p.longitude })) ?? [],
    [trail]
  );

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={FALLBACK_CENTER}
        defaultZoom={FALLBACK_ZOOM}
        styles={DARK_MAP_STYLE}
        disableDefaultUI
        zoomControl
        gestureHandling="greedy"
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        onClick={() => onSelect(null)}
      >
        <MapCamera
          riders={riders}
          focusId={selectedId}
          focusNonce={focusNonce}
          fitNonce={fitNonce}
        />

        {trailPath.length > 1 && (
          <Polyline
            path={trailPath}
            strokeColor={TRAIL_COLOR}
            strokeOpacity={0.75}
            strokeWeight={3}
          />
        )}

        {riders.map((rider) => (
          <RiderMarker
            key={rider.rider_id}
            rider={rider}
            freshness={freshnessOf(rider, staleAfterMinutes)}
            open={selectedId === rider.rider_id}
            onOpen={() => onSelect(rider.rider_id)}
            onClose={() => onSelect(null)}
            onViewDetails={onViewDetails}
            canViewDetails={canViewDetails(rider)}
          />
        ))}
      </Map>
    </APIProvider>
  );
}
