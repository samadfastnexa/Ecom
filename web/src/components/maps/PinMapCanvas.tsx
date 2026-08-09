"use client";

import { useEffect } from "react";
import { APIProvider, Map, Marker, useMap } from "@vis.gl/react-google-maps";
import { GOOGLE_MAPS_API_KEY } from "@/lib/constants";
import type { Coords } from "@/lib/geo";
import { DARK_MAP_STYLE } from "./darkMapStyle";

/** Close enough to read house numbers, which is what a delivery pin is for. */
const PIN_ZOOM = 17;

/** Teardrop, drawn as a path so no `google` global is touched during render. */
const PIN_PATH = "M 0 0 C -6 -8 -9 -12 -9 -16 A 9 9 0 1 1 9 -16 C 9 -12 6 -8 0 0 Z";

interface PinMapCanvasProps {
  coords: Coords;
  /** Omit to render a read-only map — no dragging, no click-to-set. */
  onPick?: (coords: Coords) => void;
  /**
   * Bump to recentre on `coords`. Panning on every coordinate change would
   * yank the view back while the customer is dragging the pin themselves, so
   * only moves the caller made *for* them (Use current location, switching
   * address) ask for the camera.
   */
  centerNonce?: number;
}

function MapCamera({ coords, centerNonce }: { coords: Coords; centerNonce: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    map.panTo(coords);
    if ((map.getZoom() ?? 0) < PIN_ZOOM) map.setZoom(PIN_ZOOM);
    // `coords` is deliberately absent: this fires only when the caller asks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, centerNonce]);

  return null;
}

/**
 * A single draggable pin on a map.
 *
 * Never imported directly — `PinMap` pulls it in through next/dynamic with
 * `ssr: false`. The Maps SDK touches `window` as it loads, and under
 * `output: "export"` every page is prerendered on Node at build time, so an
 * eager import fails the build rather than just the browser.
 */
export function PinMapCanvas({ coords, onPick, centerNonce = 0 }: PinMapCanvasProps) {
  const editable = Boolean(onPick);

  const pick = (latLng: google.maps.LatLngLiteral | google.maps.LatLng | null) => {
    if (!latLng || !onPick) return;
    const lat = typeof latLng.lat === "function" ? latLng.lat() : latLng.lat;
    const lng = typeof latLng.lng === "function" ? latLng.lng() : latLng.lng;
    onPick({ lat, lng });
  };

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={coords}
        defaultZoom={PIN_ZOOM}
        styles={DARK_MAP_STYLE}
        disableDefaultUI
        zoomControl
        gestureHandling="cooperative"
        clickableIcons={false}
        style={{ width: "100%", height: "100%" }}
        onClick={editable ? (e) => pick(e.detail.latLng) : undefined}
      >
        <MapCamera coords={coords} centerNonce={centerNonce} />
        <Marker
          position={coords}
          draggable={editable}
          onDragEnd={editable ? (e) => pick(e.latLng) : undefined}
          title={editable ? "Drag to move the delivery pin" : "Delivery pin"}
          icon={{
            path: PIN_PATH,
            fillColor: "#05bfdb",
            fillOpacity: 1,
            strokeColor: "#04121e",
            strokeWeight: 1.5,
            scale: 1.1,
          }}
        />
      </Map>
    </APIProvider>
  );
}
