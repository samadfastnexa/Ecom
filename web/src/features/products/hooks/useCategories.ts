"use client";

import { useAsync } from "@/hooks/useAsync";
import { categoriesApi } from "@/lib/api";

/**
 * Storefront category list — active categories only.
 *
 * The server already hides inactive categories from customers, so `active`
 * is redundant for them. It matters for staff: they get every category by
 * default, and browsing the shop while signed in would otherwise surface
 * retired categories to them alone. Asking explicitly makes the storefront
 * show the same thing to everyone.
 */
export function useCategories() {
  return useAsync(() => categoriesApi.list({ active: true }), []);
}
