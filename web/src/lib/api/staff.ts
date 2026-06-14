import { apiFetch } from "./client";
import type { AdminOrder, CreateStaffPayload, MobileProfileConfig, StaffProfile, UpdateStaffPayload } from "../types";

export const staffApi = {
  list(): Promise<StaffProfile[]> {
    return apiFetch<StaffProfile[]>("/auth/admin/staff/", { auth: true });
  },

  get(id: number): Promise<StaffProfile> {
    return apiFetch<StaffProfile>(`/auth/admin/staff/${id}/`, { auth: true });
  },

  create(payload: CreateStaffPayload): Promise<StaffProfile> {
    return apiFetch<StaffProfile>("/auth/admin/staff/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  update(id: number, payload: UpdateStaffPayload): Promise<StaffProfile> {
    return apiFetch<StaffProfile>(`/auth/admin/staff/${id}/`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  uploadDocuments(id: number, files: Record<string, File>): Promise<StaffProfile> {
    const form = new FormData();
    for (const [key, file] of Object.entries(files)) {
      form.append(key, file);
    }
    return apiFetch<StaffProfile>(`/auth/admin/staff/${id}/documents/`, {
      method: "PATCH",
      auth: true,
      body: form,
    });
  },

  history(id: number): Promise<AdminOrder[]> {
    return apiFetch<AdminOrder[]>(`/auth/admin/staff/${id}/history/`, { auth: true });
  },

  getMobileProfileConfig(): Promise<Record<string, MobileProfileConfig>> {
    return apiFetch<Record<string, MobileProfileConfig>>("/auth/admin/mobile-profile-config/", { auth: true });
  },

  updateMobileProfileConfig(
    userType: "delivery_boy" | "staff",
    fields: Record<string, { visible?: boolean; editable?: boolean }>
  ): Promise<{ user_type: string; fields: MobileProfileConfig }> {
    return apiFetch(`/auth/admin/mobile-profile-config/${userType}/`, {
      method: "PATCH",
      auth: true,
      body: { fields },
    });
  },
};
