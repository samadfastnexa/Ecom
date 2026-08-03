/* ============================================================
 *  🔧  BACKEND TOGGLE  —  matches the mobile app's switch.
 *  ------------------------------------------------------------
 *    USE_LOCAL = true   →  the admin uses your LOCAL backend
 *                          (localhost:8002 — the web runs on your PC)
 *    USE_LOCAL = false  →  the admin uses the LIVE server
 *                          (NEXT_PUBLIC_API_URL from the build, else live)
 *
 *  ⚠️ Set this back to false before building for deployment.
 * ============================================================ */
const USE_LOCAL = false;

const LOCAL_API_URL = "http://localhost:8002/api";
const LOCAL_MEDIA_URL = "http://localhost:8002";
const LIVE_API_URL = "https://century.zipnixtechnologies.com/api";
const LIVE_MEDIA_URL = "https://century.zipnixtechnologies.com";
/* ============================================================ */

export const API_URL = USE_LOCAL
  ? LOCAL_API_URL
  : process.env.NEXT_PUBLIC_API_URL || LIVE_API_URL;

export const MEDIA_URL = USE_LOCAL
  ? LOCAL_MEDIA_URL
  : process.env.NEXT_PUBLIC_MEDIA_URL || LIVE_MEDIA_URL;

/**
 * Google OAuth **Web application** client ID, from Google Cloud Console →
 * APIs & Services → Credentials (project `ecom-c08aa`). The site's origin must
 * be listed under that client's "Authorized JavaScript origins".
 *
 * Empty means Google sign-in is simply not offered — the buttons hide instead
 * of rendering something that fails on click.
 */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";

/**
 * Google Maps JavaScript API browser key, for the live rider map.
 *
 * ⚠️ This value is baked into the static bundle at build time and is fully
 * readable by anyone who loads the admin panel — a static export has no server
 * to proxy it through, so there is no way to hide it. Restrict the key by HTTP
 * referrer (Google Cloud Console → Credentials → Application restrictions →
 * Websites) to the admin origin, and by API (Maps JavaScript API only).
 * An unrestricted key here is billable by anyone who copies it.
 *
 * Empty means the map itself is not rendered — the Live Map tab falls back to
 * the rider list with a "map key not configured" notice, so tracking data is
 * still readable without it.
 */
export const GOOGLE_MAPS_API_KEY =
  process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const STORAGE_KEYS = {
  access: "ecom_access",
  refresh: "ecom_refresh",
  cart: "ecom_cart",
} as const;

/** Image upload limits (must match the backend in core/image_limits.py). */
export const MAX_IMAGES = 3;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_SIZE_LABEL = "5 MB";
