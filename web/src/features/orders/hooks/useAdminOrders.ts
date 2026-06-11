"use client";

import { useAsync } from "@/hooks/useAsync";
import { ordersApi } from "@/lib/api";
import type { AdminOrderFilters } from "@/lib/types";

const filterKey = (f: AdminOrderFilters) =>
  `${f.status ?? ""}|${f.search ?? ""}|${f.date_from ?? ""}|${f.date_to ?? ""}|${f.is_paid ?? ""}`;

export function useAdminOrders(filters: AdminOrderFilters) {
  return useAsync(() => ordersApi.adminList(filters), [filterKey(filters)]);
}

export function useAdminSummary() {
  return useAsync(() => ordersApi.adminSummary(), []);
}

export function useDeliveryBoys() {
  return useAsync(() => ordersApi.adminDeliveryBoys(), []);
}
