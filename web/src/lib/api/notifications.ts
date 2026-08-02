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

/** One previously-sent broadcast, as recorded server-side. */
export interface SentNotification {
  id: number;
  title: string;
  body: string;
  recipient_type: NotificationAudience | "test";
  image_url: string | null;
  sent_count: number;
  total_devices: number;
  success_rate: number;
  scheduled_for: string | null;
  created_at: string;
  sent_at: string | null;
  sent_by: string | null;
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

  /** Every broadcast ever sent, newest first — survives a page reload. */
  history(opts: { recipient_type?: string; limit?: number } = {}): Promise<SentNotification[]> {
    const params = new URLSearchParams();
    if (opts.recipient_type && opts.recipient_type !== "all") {
      params.set("recipient_type", opts.recipient_type);
    }
    if (opts.limit) params.set("limit", String(opts.limit));
    const qs = params.toString();
    return apiFetch<SentNotification[]>(
      `/auth/admin/notifications/history/${qs ? `?${qs}` : ""}`,
      { auth: true },
    );
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
