"use client";

import { useAsync } from "@/hooks/useAsync";
import { productsApi } from "@/lib/api";

export function useProduct(id: string | number) {
  return useAsync(() => productsApi.get(id), [String(id)]);
}
