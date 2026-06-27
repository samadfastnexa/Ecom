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

export const STORAGE_KEYS = {
  access: "ecom_access",
  refresh: "ecom_refresh",
  cart: "ecom_cart",
} as const;

/** Image upload limits (must match the backend in core/image_limits.py). */
export const MAX_IMAGES = 3;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_SIZE_LABEL = "5 MB";
