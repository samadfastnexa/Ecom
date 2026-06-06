import { apiFetch, unwrapList } from "./client";
import type { Complaint, ComplaintInput, Paginated } from "../types";

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
