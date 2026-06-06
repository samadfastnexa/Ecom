"use client";

import { useAsync } from "@/hooks/useAsync";
import { productsApi, type ProductQuery } from "@/lib/api";

/** Server-filtered product list (category + search). */
export function useProducts(query: ProductQuery) {
  const key = `${query.category ?? ""}|${query.search ?? ""}`;
  return useAsync(() => productsApi.list(query), [key]);
}
