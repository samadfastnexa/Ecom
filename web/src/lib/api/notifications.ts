import { apiFetch } from "./client";

export type NotificationAudience = "all" | "customers" | "riders";

export interface SendNotificationPayload {
  title: string;
  body: string;
  recipient_type: NotificationAudience;
}

export interface SendNotificationResult {
  sent: number;
  total_tokens: number;
}

export const notificationsApi = {
  send(payload: SendNotificationPayload): Promise<SendNotificationResult> {
    return apiFetch<SendNotificationResult>("/auth/admin/notifications/send/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
};
