"use client";

import { useEffect, useState } from "react";
import { Crosshair, Pencil, Trash2 } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  GeolocationError,
  coordToString,
  geolocationPermission,
  isValidLat,
  isValidLng,
  parseCoord,
  requestCurrentPosition,
  type Coords,
} from "@/lib/geo";
import { Button, FieldLabel } from "@/components/ui";
import { MAPS_ENABLED, PinMap } from "@/components/maps/PinMap";

interface LocationSectionProps {
  coords: Coords | null;
  onChange: (coords: Coords | null) => void;
  /** Changing this recentres the map — used when the chosen address changes. */
  recenterKey?: string | number;
  /** Shown beside the heading, e.g. while the pin is being saved. */
  status?: string;
  className?: string;
}

/**
 * The delivery pin: where the rider actually stops.
 *
 * Three ways in, because no single one works everywhere. Geolocation is the
 * fast path but needs permission and https; dragging needs a basemap, which
 * needs an API key this build may not have; typing coordinates always works.
 * The pin stays optional throughout — an address with no pin is still an
 * address, and blocking checkout over it would be worse than a rider phoning.
 */
export function LocationSection({
  coords,
  onChange,
  recenterKey,
  status,
  className,
}: LocationSectionProps) {
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState | "unknown">("unknown");
  // With no basemap, typing coordinates is the only way to adjust an existing
  // pin, so it cannot be hidden behind a disclosure the customer must find.
  const [manualOpen, setManualOpen] = useState(!MAPS_ENABLED);
  const [latText, setLatText] = useState("");
  const [lngText, setLngText] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const [centerNonce, setCenterNonce] = useState(0);

  // Warn before the click when a past refusal is still in force — the browser
  // will not show the prompt again, so the button would just appear broken.
  useEffect(() => {
    let active = true;
    geolocationPermission().then((state) => active && setPermission(state));
    return () => {
      active = false;
    };
  }, []);

  // Mirror the pin into the manual fields, so they show what is actually set
  // rather than whatever was last typed into them.
  useEffect(() => {
    setLatText(coords ? coordToString(coords.lat) : "");
    setLngText(coords ? coordToString(coords.lng) : "");
    setManualError(null);
  }, [coords]);

  // A different address means a different part of the city.
  useEffect(() => {
    setCenterNonce((n) => n + 1);
  }, [recenterKey]);

  const setFromDevice = async () => {
    setLocating(true);
    setGeoError(null);
    try {
      const found = await requestCurrentPosition();
      onChange(found);
      setCenterNonce((n) => n + 1);
      // A refusal can be revoked at any time; re-read rather than trusting the
      // state captured on mount.
      setPermission("granted");
    } catch (e) {
      setGeoError(
        e instanceof GeolocationError
          ? e.message
          : "Could not read your location. Set the pin by hand below."
      );
      if (e instanceof GeolocationError && e.reason === "denied") {
        setPermission("denied");
        setManualOpen(true);
      }
    } finally {
      setLocating(false);
    }
  };

  const applyManual = () => {
    const lat = parseCoord(latText);
    const lng = parseCoord(lngText);
    if (lat === null || lng === null) {
      setManualError("Enter both latitude and longitude.");
      return;
    }
    if (!isValidLat(lat) || !isValidLng(lng)) {
      setManualError("Latitude must be -90 to 90 and longitude -180 to 180.");
      return;
    }
    setManualError(null);
    onChange({ lat, lng });
    setCenterNonce((n) => n + 1);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FieldLabel requirement="optional" className="mb-0">
          Map location
        </FieldLabel>
        {status && <span className="text-xs text-mist/50">{status}</span>}
      </div>

      <PinMap
        coords={coords}
        onPick={(picked) => onChange(picked)}
        centerNonce={centerNonce}
        emptyHint="Use your current location, or type the coordinates, so the rider finds the door without calling."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={setFromDevice}
          loading={locating}
          className="px-3 py-2 text-sm"
        >
          <Crosshair size={15} /> Use current location
        </Button>

        {MAPS_ENABLED && (
          <button
            type="button"
            onClick={() => setManualOpen((open) => !open)}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-mist/60 transition hover:text-mist"
          >
            <Pencil size={12} /> {manualOpen ? "Hide" : "Enter"} coordinates
          </button>
        )}

        {coords && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs text-mist/50 transition hover:text-rose-300"
          >
            <Trash2 size={12} /> Remove pin
          </button>
        )}
      </div>

      {permission === "denied" && !geoError && (
        <p className="text-xs text-amber-200/80">
          This site is blocked from using your location. Allow it in your
          browser&apos;s site settings, or type the coordinates below.
        </p>
      )}

      {geoError && (
        <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          {geoError}
        </p>
      )}

      {manualOpen && (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border border-white/10 bg-white/5 p-3">
          <label className="flex-1 min-w-[8rem] text-xs text-mist/50">
            Latitude
            <input
              className="input mt-1 py-2 text-sm"
              value={latText}
              onChange={(e) => setLatText(e.target.value)}
              inputMode="decimal"
              placeholder="31.520400"
            />
          </label>
          <label className="flex-1 min-w-[8rem] text-xs text-mist/50">
            Longitude
            <input
              className="input mt-1 py-2 text-sm"
              value={lngText}
              onChange={(e) => setLngText(e.target.value)}
              inputMode="decimal"
              placeholder="74.358700"
            />
          </label>
          <Button
            type="button"
            variant="ghost"
            onClick={applyManual}
            className="px-3 py-2 text-sm"
          >
            Set pin
          </Button>
          {manualError && (
            <p className="w-full text-xs text-rose-300">{manualError}</p>
          )}
        </div>
      )}
    </div>
  );
}
