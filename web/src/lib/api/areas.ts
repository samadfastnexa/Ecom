import { apiFetch } from "./client";
import type { Area } from "../types";

/**
 * Delivery localities.
 *
 * `list()` is public because the signup form needs it before any user exists;
 * everything else is staff-only. The list drives a dropdown but does not
 * constrain what a customer may type, so `UserProfile.area` stays free text.
 */
export const areasApi = {
  list(): Promise<Area[]> {
    return apiFetch<Area[]>("/auth/areas/");
  },

  adminList(): Promise<Area[]> {
    return apiFetch<Area[]>("/auth/admin/areas/", { auth: true });
  },

  create(payload: { name: string; order?: number }): Promise<Area> {
    return apiFetch<Area>("/auth/admin/areas/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  update(id: number, payload: Partial<Pick<Area, "name" | "is_active" | "order">>): Promise<Area> {
    return apiFetch<Area>(`/auth/admin/areas/${id}/`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  remove(id: number): Promise<void> {
    return apiFetch<void>(`/auth/admin/areas/${id}/`, { method: "DELETE", auth: true });
  },
};
