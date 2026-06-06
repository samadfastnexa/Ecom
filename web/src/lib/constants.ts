export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8002/api";

export const MEDIA_URL =
  process.env.NEXT_PUBLIC_MEDIA_URL || "http://localhost:8002";

export const STORAGE_KEYS = {
  access: "ecom_access",
  refresh: "ecom_refresh",
  cart: "ecom_cart",
} as const;
