/**
 * Delivery-pin helpers.
 *
 * Coordinates cross the API as decimal *strings* (DRF serialises DecimalField
 * that way), while every map and input works in numbers — so the conversion
 * lives here rather than being re-derived at each call site, where a stray
 * `parseFloat("")` quietly becomes NaN and lands a rider at 0°,0°.
 */

export interface Coords {
  lat: number;
  lng: number;
}

/** Matches CustomerAddress.latitude's `decimal_places=6` on the backend. */
const COORD_DECIMALS = 6;

export function isValidLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

export function isValidLng(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/** Decimal string → number, or null for empty/blank/unparseable input. */
export function parseCoord(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/** Both halves of a pin, or null when either is missing — a pin is a pair. */
export function coordsFrom(
  lat: string | null | undefined,
  lng: string | null | undefined
): Coords | null {
  const latN = parseCoord(lat);
  const lngN = parseCoord(lng);
  if (latN === null || lngN === null) return null;
  if (!isValidLat(latN) || !isValidLng(lngN)) return null;
  return { lat: latN, lng: lngN };
}

/** Number → the decimal string the API stores, rounded to its precision. */
export function coordToString(n: number): string {
  return n.toFixed(COORD_DECIMALS);
}

/** Compact human-readable pin, e.g. `31.520400, 74.358700`. */
export function formatCoords(coords: Coords): string {
  return `${coordToString(coords.lat)}, ${coordToString(coords.lng)}`;
}

/**
 * Universal Google Maps URL — works in the app on mobile and the site on
 * desktop, and needs no API key, which is why it is the one map affordance
 * that is always available.
 */
export function googleMapsUrl(coords: Coords): string {
  return `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`;
}

/* ---------- Browser geolocation ---------- */

export type GeoFailure =
  | "unsupported"
  | "insecure"
  | "denied"
  | "unavailable"
  | "timeout";

export class GeolocationError extends Error {
  reason: GeoFailure;
  constructor(reason: GeoFailure, message: string) {
    super(message);
    this.reason = reason;
    this.name = "GeolocationError";
  }
}

const GEO_MESSAGES: Record<GeoFailure, string> = {
  unsupported: "This browser cannot share your location. Drop the pin by hand instead.",
  insecure:
    "Browsers only share location over a secure (https) connection. Drop the pin by hand instead.",
  denied:
    "Location permission was refused. Allow it in your browser's site settings, or set the pin by hand below.",
  unavailable:
    "Your device could not get a location fix. Move somewhere with a clearer signal, or set the pin by hand.",
  timeout: "Getting your location took too long. Try again, or set the pin by hand.",
};

/** How long to wait for a fix. A cold GPS start indoors can take this long. */
const GEO_TIMEOUT_MS = 15_000;

/**
 * Ask the browser where the user is.
 *
 * Rejects with a `GeolocationError` carrying a reason the UI can act on —
 * a refusal deserves different advice ("allow it in site settings") from a
 * failed fix ("move somewhere with signal"), and both must be said out loud
 * rather than leaving a button that silently does nothing.
 */
export function requestCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new GeolocationError("unsupported", GEO_MESSAGES.unsupported));
      return;
    }
    // Chrome and Safari drop the API entirely on insecure origins, which
    // surfaces as a bare PERMISSION_DENIED that no site setting can fix.
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(new GeolocationError("insecure", GEO_MESSAGES.insecure));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        const reason: GeoFailure =
          err.code === err.PERMISSION_DENIED
            ? "denied"
            : err.code === err.TIMEOUT
              ? "timeout"
              : "unavailable";
        reject(new GeolocationError(reason, GEO_MESSAGES[reason]));
      },
      {
        // A delivery pin is worth the extra second and battery that the GPS
        // radio costs — a 2 km cell-tower estimate is useless to a rider.
        enableHighAccuracy: true,
        timeout: GEO_TIMEOUT_MS,
        maximumAge: 0,
      }
    );
  });
}

/**
 * Whether the site is already allowed, blocked, or will be asked.
 *
 * Permissions API support is uneven, so "unknown" is a normal answer and the
 * caller must still be able to just try — this only exists to warn up front
 * when a previous refusal is still in force and the prompt will never appear.
 */
export async function geolocationPermission(): Promise<PermissionState | "unknown"> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) {
    return "unknown";
  }
  try {
    const status = await navigator.permissions.query({ name: "geolocation" });
    return status.state;
  } catch {
    // Firefox historically threw on the geolocation descriptor. Not knowing is
    // harmless: the button still works and the prompt still appears.
    return "unknown";
  }
}
