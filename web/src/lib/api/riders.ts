import { apiFetch } from "./client";
import type {
  AdminOrder,
  CreateRiderPayload,
  RiderProfile,
  UpdateRiderPayload,
} from "../types";

export const ridersApi = {
  list(): Promise<RiderProfile[]> {
    return apiFetch<RiderProfile[]>("/auth/admin/riders/", { auth: true });
  },

  get(id: number): Promise<RiderProfile> {
    return apiFetch<RiderProfile>(`/auth/admin/riders/${id}/`, { auth: true });
  },

  create(payload: CreateRiderPayload): Promise<RiderProfile> {
    return apiFetch<RiderProfile>("/auth/admin/riders/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  update(id: number, payload: UpdateRiderPayload): Promise<RiderProfile> {
    return apiFetch<RiderProfile>(`/auth/admin/riders/${id}/`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  history(id: number): Promise<AdminOrder[]> {
    return apiFetch<AdminOrder[]>(`/auth/admin/riders/${id}/history/`, {
      auth: true,
    });
  },
};
