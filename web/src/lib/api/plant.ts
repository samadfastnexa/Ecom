import { apiFetch, unwrapList, apiDownload } from "./client";
import type {
  CreatePlantRecordInput,
  Paginated,
  PlantAnalytics,
  PlantCustomer,
  PlantDateRange,
  PlantFilters,
  PlantRecord,
  PlantSettings,
  PlantSummary,
  PricedType,
  PricedTypeInput,
} from "../types";

/** CRUD resource for a named/priced lookup (customer types, bottle types). */
function makeTypeResource(base: string) {
  return {
    list(activeOnly = false): Promise<PricedType[]> {
      return apiFetch<PricedType[] | Paginated<PricedType>>(
        `${base}${activeOnly ? "?active=true" : ""}`,
        { auth: true }
      ).then(unwrapList);
    },
    create(body: PricedTypeInput): Promise<PricedType> {
      return apiFetch<PricedType>(base, { method: "POST", auth: true, body });
    },
    update(id: number, body: Partial<PricedTypeInput>): Promise<PricedType> {
      return apiFetch<PricedType>(`${base}${id}/`, {
        method: "PATCH",
        auth: true,
        body,
      });
    },
    remove(id: number): Promise<void> {
      return apiFetch<void>(`${base}${id}/`, { method: "DELETE", auth: true });
    },
  };
}

export type TypeResource = ReturnType<typeof makeTypeResource>;

/** Build a query string from any PlantFilters object. */
export function buildFilterQuery(filters: PlantFilters = {}): string {
  const sp = new URLSearchParams();
  if (filters.date) sp.set("date", filters.date);
  if (filters.start) sp.set("start", filters.start);
  if (filters.end) sp.set("end", filters.end);
  if (filters.payment_status) sp.set("payment_status", filters.payment_status);
  if (filters.customer_type) sp.set("customer_type", String(filters.customer_type));
  if (filters.bottle_type) sp.set("bottle_type", String(filters.bottle_type));
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const plantApi = {
  records(filters: PlantFilters = {}): Promise<PlantRecord[]> {
    return apiFetch<PlantRecord[] | Paginated<PlantRecord>>(
      `/plant/records/${buildFilterQuery(filters)}`,
      { auth: true }
    ).then(unwrapList);
  },

  create(body: CreatePlantRecordInput): Promise<PlantRecord> {
    return apiFetch<PlantRecord>("/plant/records/", {
      method: "POST",
      auth: true,
      body,
    });
  },

  update(id: number, body: Partial<CreatePlantRecordInput>): Promise<PlantRecord> {
    return apiFetch<PlantRecord>(`/plant/records/${id}/`, {
      method: "PATCH",
      auth: true,
      body,
    });
  },

  remove(id: number): Promise<void> {
    return apiFetch<void>(`/plant/records/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },

  summary(filters: PlantFilters = {}): Promise<PlantSummary> {
    return apiFetch<PlantSummary>(
      `/plant/summary/${buildFilterQuery(filters)}`,
      { auth: true }
    );
  },

  analytics(filters: PlantFilters = {}): Promise<PlantAnalytics> {
    return apiFetch<PlantAnalytics>(
      `/plant/analytics/${buildFilterQuery(filters)}`,
      { auth: true }
    );
  },

  customers(): Promise<PlantCustomer[]> {
    return apiFetch<PlantCustomer[]>("/plant/customers/", { auth: true });
  },

  customerTypes: makeTypeResource("/plant/customer-types/"),
  bottleTypes: makeTypeResource("/plant/bottle-types/"),

  getSettings(): Promise<PlantSettings> {
    return apiFetch<PlantSettings>("/plant/settings/", { auth: true });
  },

  updateSettings(standard_unit_price: number): Promise<PlantSettings> {
    return apiFetch<PlantSettings>("/plant/settings/", {
      method: "PATCH",
      auth: true,
      body: { standard_unit_price },
    });
  },

  exportExcel(filters: PlantFilters = {}): Promise<void> {
    return apiDownload(
      `/plant/export/${buildFilterQuery(filters)}`,
      "plant-deliveries.xlsx"
    );
  },
};
