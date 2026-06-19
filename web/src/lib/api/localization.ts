import { apiFetch } from "./client";

export interface LanguageAccessSetting {
  allowed_user_types: string[];
}

export const localizationApi = {
  getLanguageAccess(): Promise<LanguageAccessSetting> {
    return apiFetch("/localization/language-access/", { auth: true });
  },
  updateLanguageAccess(allowed_user_types: string[]): Promise<LanguageAccessSetting> {
    return apiFetch("/localization/language-access/", {
      method: "PATCH",
      auth: true,
      body: { allowed_user_types },
    });
  },
};
