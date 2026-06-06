import { MEDIA_URL } from "./constants";

/** Resolve a product image path into an absolute URL. */
export function imageUrl(image: string | null): string | null {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  if (image.startsWith("/media")) return `${MEDIA_URL}${image}`;
  return `${MEDIA_URL}/media/${image}`;
}

/** Format a numeric/string amount as PKR. */
export function formatPrice(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return `Rs ${n.toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
}

/** Human-friendly date/time. */
export function formatDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
