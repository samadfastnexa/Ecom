import { apiFetch } from "./client";

export type NotificationAudience = "all" | "customers" | "riders" | "admins";

export interface SendNotificationPayload {
  title: string;
  body: string;
  recipient_type: NotificationAudience;
}

export interface SendNotificationResult {
  sent: number;
  total_tokens: number;
}

export interface NotificationTemplate {
  id: number;
  name: string;
  title: string;
  body: string;
  recipient_type: NotificationAudience;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationTemplateInput {
  name: string;
  title: string;
  body: string;
  recipient_type: NotificationAudience;
}

const TEMPLATES_BASE = "/auth/admin/notifications/templates/";

export const notificationsApi = {
  send(payload: SendNotificationPayload): Promise<SendNotificationResult> {
    return apiFetch<SendNotificationResult>("/auth/admin/notifications/send/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  listTemplates(): Promise<NotificationTemplate[]> {
    return apiFetch<NotificationTemplate[]>(TEMPLATES_BASE, { auth: true });
  },

  createTemplate(payload: NotificationTemplateInput): Promise<NotificationTemplate> {
    return apiFetch<NotificationTemplate>(TEMPLATES_BASE, {
      method: "POST",
      auth: true,
      body: payload,
    });
  },

  updateTemplate(
    id: number,
    payload: NotificationTemplateInput
  ): Promise<NotificationTemplate> {
    return apiFetch<NotificationTemplate>(`${TEMPLATES_BASE}${id}/`, {
      method: "PUT",
      auth: true,
      body: payload,
    });
  },

  deleteTemplate(id: number): Promise<void> {
    return apiFetch<void>(`${TEMPLATES_BASE}${id}/`, {
      method: "DELETE",
      auth: true,
    });
  },
};
