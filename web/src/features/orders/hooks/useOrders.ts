"use client";

import { useAsync } from "@/hooks/useAsync";
import { ordersApi } from "@/lib/api";

export function useOrders() {
  return useAsync(() => ordersApi.list(), []);
}
