"use client";

import { useAsync } from "@/hooks/useAsync";
import { ordersApi } from "@/lib/api";
import type { AdminOrderFilters } from "@/lib/types";

const filterKey = (f: AdminOrderFilters) =>
  `${f.status ?? ""}|${f.search ?? ""}|${f.date_from ?? ""}|${f.date_to ?? ""}|${f.is_paid ?? ""}`;

export function useAdminOrders(filters: AdminOrderFilters) {
  return useAsync(() => ordersApi.adminList(filters), [filterKey(filters)]);
}

/**
 * Headline stats, optionally scoped to a date range. Deps are the raw strings
 * rather than the object so a caller re-rendering with a fresh `{}` literal
 * doesn't trigger a refetch on every keystroke elsewhere on the page.
 */
export function useAdminSummary(
  range: { date_from?: string; date_to?: string } = {}
) {
  return useAsync(() => ordersApi.adminSummary(range), [
    range.date_from ?? "",
    range.date_to ?? "",
  ]);
}

export function useDeliveryBoys() {
  return useAsync(() => ordersApi.adminDeliveryBoys(), []);
}
