"use client";

import { useAsync } from "@/hooks/useAsync";
import { plantApi } from "@/lib/api";
import type { PlantDateRange, PlantFilters } from "@/lib/types";

const filterKey = (f: PlantFilters) =>
  `${f.date ?? ""}|${f.start ?? ""}|${f.end ?? ""}|${f.payment_status ?? ""}|${f.customer_type ?? ""}|${f.bottle_type ?? ""}`;

export function usePlantRecords(filters: PlantFilters) {
  return useAsync(() => plantApi.records(filters), [filterKey(filters)]);
}

export function usePlantSummary(filters: PlantFilters) {
  return useAsync(() => plantApi.summary(filters), [filterKey(filters)]);
}

export function usePlantAnalytics(filters: PlantFilters) {
  return useAsync(() => plantApi.analytics(filters), [filterKey(filters)]);
}

export function usePlantCustomers() {
  return useAsync(() => plantApi.customers(), []);
}

export function usePlantSettings() {
  return useAsync(() => plantApi.getSettings(), []);
}

export function usePlantCustomerTypes(activeOnly = false) {
  return useAsync(
    () => plantApi.customerTypes.list(activeOnly),
    [activeOnly ? "active" : "all"]
  );
}

export function usePlantBottleTypes(activeOnly = false) {
  return useAsync(
    () => plantApi.bottleTypes.list(activeOnly),
    [activeOnly ? "active" : "all"]
  );
}
