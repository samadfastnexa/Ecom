import { apiFetch, unwrapList } from "./client";
import type { CreateOrderPayload, Order, Paginated } from "../types";

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
};
