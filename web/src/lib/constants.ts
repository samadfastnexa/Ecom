export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api";

export const MEDIA_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:8002";

export const STORAGE_KEYS = {
  access: "ecom_access",
  refresh: "ecom_refresh",
  cart: "ecom_cart",
} as const;

/** Image upload limits (must match the backend in core/image_limits.py). */
export const MAX_IMAGES = 3;
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
export const MAX_IMAGE_SIZE_LABEL = "5 MB";
