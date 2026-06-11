import { apiFetch, unwrapList } from "./client";
import type {
  AdminOrder,
  AdminOrderFilters,
  AdminOrderSummary,
  AdminOrderUpdatePayload,
  CreateAdminOrderPayload,
  CreateOrderPayload,
  CustomerOrderStats,
  DeliveryBoy,
  DeliveryStatusOption,
  Order,
  Paginated,
} from "../types";

function buildAdminQuery(filters: AdminOrderFilters = {}): string {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  if (filters.search) sp.set("search", filters.search);
  if (filters.date_from) sp.set("date_from", filters.date_from);
  if (filters.date_to) sp.set("date_to", filters.date_to);
  if (filters.is_paid !== "" && filters.is_paid !== undefined)
    sp.set("is_paid", String(filters.is_paid));
  if (filters.show_hidden) sp.set("show_hidden", "true");
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

export const ordersApi = {
  list(): Promise<Order[]> {
    return apiFetch<Order[] | Paginated<Order>>("/orders/", {
      auth: true,
    }).then(unwrapList);
  },

  get(id: string | number): Promise<Order> {
    return apiFetch<Order>(`/orders/${id}/`, { auth: true });
  },

  create(payload: CreateOrderPayload): Promise<Order> {
    return apiFetch<Order>("/orders/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  adminCreate(payload: CreateAdminOrderPayload): Promise<AdminOrder> {
    return apiFetch<AdminOrder>("/orders/admin/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  adminList(filters: AdminOrderFilters = {}): Promise<AdminOrder[]> {
    return apiFetch<AdminOrder[] | Paginated<AdminOrder>>(
      `/orders/admin/${buildAdminQuery(filters)}`,
      { auth: true }
    ).then(unwrapList);
  },

  adminUpdate(id: number, data: AdminOrderUpdatePayload): Promise<AdminOrder> {
    return apiFetch<AdminOrder>(`/orders/admin/${id}/`, {
      method: "PATCH",
      auth: true,
      body: data,
    });
  },

  adminSummary(): Promise<AdminOrderSummary> {
    return apiFetch<AdminOrderSummary>("/orders/admin/summary/", { auth: true });
  },

  adminDeliveryBoys(): Promise<DeliveryBoy[]> {
    return apiFetch<DeliveryBoy[]>("/orders/admin/delivery-boys/", { auth: true });
  },

  deliveryStatuses(): Promise<DeliveryStatusOption[]> {
    return apiFetch<DeliveryStatusOption[]>("/orders/delivery/statuses/", { auth: true });
  },

  addressSuggestions(q: string): Promise<string[]> {
    return apiFetch<string[]>(`/orders/admin/address-suggestions/?q=${encodeURIComponent(q)}`, { auth: true });
  },

  customerStats(userId: number): Promise<CustomerOrderStats> {
    return apiFetch<CustomerOrderStats>(`/orders/admin/customer-stats/${userId}/`, { auth: true });
  },
};
