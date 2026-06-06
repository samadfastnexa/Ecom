"use client";

import { useAsync } from "@/hooks/useAsync";
import { categoriesApi } from "@/lib/api";

export function useCategories() {
  return useAsync(() => categoriesApi.list(), []);
}
