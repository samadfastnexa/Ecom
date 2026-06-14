import { apiFetch, unwrapList } from "./client";
import type { Complaint, AdminComplaint, ComplaintStatus, ComplaintInput, Paginated } from "../types";

export const complaintsApi = {
  list(): Promise<Complaint[]> {
    return apiFetch<Complaint[] | Paginated<Complaint>>(
      "/support/complaints/",
      { auth: true }
    ).then(unwrapList);
  },

  create(payload: ComplaintInput): Promise<Complaint> {
    return apiFetch<Complaint>("/support/complaints/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
};

export const adminComplaintsApi = {
  list(status?: ComplaintStatus): Promise<AdminComplaint[]> {
    const qs = status ? `?status=${status}` : "";
    return apiFetch<AdminComplaint[] | Paginated<AdminComplaint>>(
      `/support/complaints/admin/${qs}`,
      { auth: true }
    ).then(unwrapList);
  },

  create(payload: {
    user_id: number;
    subject: string;
    description: string;
  }): Promise<AdminComplaint> {
    return apiFetch<AdminComplaint>("/support/complaints/admin/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  reply(
    id: number,
    payload: { admin_reply?: string; status?: ComplaintStatus }
  ): Promise<AdminComplaint> {
    return apiFetch<AdminComplaint>(`/support/complaints/${id}/`, {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  edit(
    id: number,
    payload: { subject: string; description: string }
  ): Promise<AdminComplaint> {
    return apiFetch<AdminComplaint>(`/support/complaints/${id}/`, {
      method: "PUT",
      auth: true,
      body: payload,
    });
  },

  delete(id: number): Promise<void> {
    return apiFetch<void>(`/support/complaints/${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },
};
