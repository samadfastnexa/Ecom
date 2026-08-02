import { apiFetch } from "./client";

/**
 * Admin-initiated password resets. Works for any user id (rider, staff or
 * customer) — the backend requires the caller to be staff.
 *
 * Note: these take a Django **user id**, not a UserProfile id. On rider/staff
 * records that is `profile.user_id`, not `profile.id`.
 */
export const passwordApi = {
  /** Set an explicit password chosen by the admin. */
  set(userId: number, newPassword: string): Promise<{ detail: string }> {
    return apiFetch(`/auth/admin/reset-password/${userId}/`, {
      method: "POST",
      auth: true,
      body: { new_password: newPassword },
    });
  },

  /** Have the backend generate a random temporary password and return it. */
  generate(userId: number): Promise<{ detail: string; new_password: string }> {
    return apiFetch(`/auth/admin/reset-password/${userId}/`, {
      method: "POST",
      auth: true,
      body: { generate: true },
    });
  },
};
