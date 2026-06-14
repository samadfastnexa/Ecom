import { apiFetch } from "./client";
import type { AdminCustomer, CreateCustomerPayload, CustomerOrderStats } from "../types";

export const customersApi = {
  list(search?: string): Promise<AdminCustomer[]> {
    const qs = search ? `?search=${encodeURIComponent(search)}` : "";
    return apiFetch<AdminCustomer[]>(`/auth/admin/customers/${qs}`, { auth: true });
  },

  get(userId: number): Promise<AdminCustomer> {
    return apiFetch<AdminCustomer>(`/auth/admin/customers/${userId}/`, { auth: true });
  },

  create(payload: CreateCustomerPayload): Promise<AdminCustomer> {
    return apiFetch<AdminCustomer>("/auth/admin/customers/create/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  update(
    userId: number,
    payload: { phone_number?: string | null; address?: string | null; first_name?: string; last_name?: string; is_active?: boolean }
  ): Promise<AdminCustomer> {
    return apiFetch<AdminCustomer>(`/auth/admin/customers/${userId}/`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  stats(userId: number): Promise<CustomerOrderStats> {
    return apiFetch<CustomerOrderStats>(`/orders/admin/customer-stats/${userId}/`, { auth: true });
  },

  resetPassword(userId: number, newPassword: string): Promise<{ detail: string }> {
    return apiFetch(`/auth/admin/reset-password/${userId}/`, {
      method: "POST",
      auth: true,
      body: { new_password: newPassword },
    });
  },
};
