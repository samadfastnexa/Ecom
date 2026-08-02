import { apiFetch } from "./client";
import type {
  AuthTokens,
  ChangePasswordPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UserProfile,
} from "../types";

export const authApi = {
  login(username: string, password: string): Promise<AuthTokens> {
    return apiFetch<AuthTokens>("/auth/login/", {
      method: "POST",
      body: { username, password },
    });
  },

  register(payload: RegisterPayload): Promise<unknown> {
    return apiFetch("/auth/register/", { method: "POST", body: payload });
  },

  /**
   * Exchange a Google OAuth access token for our own JWT pair. The backend
   * verifies the token with Google and creates a customer account on first use.
   */
  google(accessToken: string): Promise<AuthTokens> {
    return apiFetch<AuthTokens>("/auth/google/", {
      method: "POST",
      body: { access_token: accessToken },
    });
  },

  profile(): Promise<UserProfile> {
    return apiFetch<UserProfile>("/auth/profile/", { auth: true });
  },

  updateProfile(payload: UpdateProfilePayload): Promise<UserProfile> {
    return apiFetch<UserProfile>("/auth/profile/", {
      method: "PATCH",
      auth: true,
      body: payload,
    });
  },

  changePassword(payload: ChangePasswordPayload): Promise<void> {
    return apiFetch<void>("/auth/change-password/", {
      method: "POST",
      auth: true,
      body: payload,
    });
  },
};
