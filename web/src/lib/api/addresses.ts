import { apiFetch, unwrapList } from "./client";
import type { CustomerAddress, CustomerAddressInput, Paginated } from "../types";

/**
 * The signed-in customer's own address book.
 *
 * Every route is scoped to `request.user` server-side, so there is no user id
 * to pass and an id belonging to somebody else simply 404s. The first address
 * a customer saves becomes their default automatically, which is what lets
 * checkout pre-select one without asking.
 */
export const addressesApi = {
  /** Default first, then most recently updated — the order checkout relies on. */
  list(): Promise<CustomerAddress[]> {
    return apiFetch<CustomerAddress[] | Paginated<CustomerAddress>>(
      "/auth/addresses/",
      { auth: true }
    ).then(unwrapList);
  },

  create(payload: CustomerAddressInput): Promise<CustomerAddress> {
    return apiFetch<CustomerAddress>("/auth/addresses/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  update(
    id: number,
    payload: Partial<CustomerAddressInput>
  ): Promise<CustomerAddress> {
    return apiFetch<CustomerAddress>(`/auth/addresses/${id}/`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  remove(id: number): Promise<void> {
    return apiFetch<void>(`/auth/addresses/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },

  /** Promotes this address; the server demotes whichever held the default. */
  setDefault(id: number): Promise<CustomerAddress> {
    return apiFetch<CustomerAddress>(`/auth/addresses/${id}/set_default/`, {
      method: "POST",
      auth: true,
    });
  },
};
