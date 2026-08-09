import { API_URL, STORAGE_KEYS } from "../constants";
import type { Paginated } from "../types";

/* ---------- Token storage ---------- */

export const tokenStore = {
  get access() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.access);
  },
  get refresh() {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEYS.refresh);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(STORAGE_KEYS.access, access);
    if (refresh) localStorage.setItem(STORAGE_KEYS.refresh, refresh);
  },
  clear() {
    localStorage.removeItem(STORAGE_KEYS.access);
    localStorage.removeItem(STORAGE_KEYS.refresh);
  },
};

/* ---------- Error type ---------- */

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/* ---------- Core fetch wrapper ---------- */

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  auth?: boolean;
  retry?: boolean;
}

async function refreshAccessToken(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Rotation issues a new refresh token each time — persist it so the next
    // refresh doesn't use a now-blacklisted one (which would force a re-login).
    tokenStore.set(data.access, data.refresh);
    return data.access as string;
  } catch {
    return null;
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { body, auth = false, retry = true, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth && tokenStore.access) {
    finalHeaders["Authorization"] = `Bearer ${tokenStore.access}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body:
      body === undefined
        ? undefined
        : body instanceof FormData
          ? body
          : JSON.stringify(body),
  });

  // Single token refresh attempt on 401 for authenticated calls.
  if (res.status === 401 && auth && retry) {
    const newAccess = await refreshAccessToken();
    if (newAccess) return apiFetch<T>(path, { ...options, retry: false });
    tokenStore.clear();
    if (typeof window !== "undefined") {
      window.location.replace("/login");
    }
  }

  if (!res.ok) {
    let detail: string;
    try {
      const data = await res.json();
      if (typeof data === "string") {
        detail = data;
      } else if (data.detail) {
        detail = data.detail;
      } else {
        // DRF field errors look like { field: ["message", …] } — surface the
        // first human-readable message rather than dumping raw JSON.
        const first = Object.values(data)[0];
        detail = Array.isArray(first)
          ? String(first[0])
          : typeof first === "string"
            ? first
            : JSON.stringify(data);
      }
    } catch {
      detail = `${res.status} ${res.statusText}`;
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

/** Normalize DRF responses that may be a bare array or paginated. */
export function unwrapList<T>(res: T[] | Paginated<T>): T[] {
  return Array.isArray(res) ? res : res.results;
}

/**
 * Fetch a file (with auth header) and trigger a browser download.
 * Used for the Excel export, which a plain <a> can't authenticate.
 */
export async function apiDownload(
  path: string,
  fallbackName: string
): Promise<void> {
  const headers: Record<string, string> = {};
  if (tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError("Download failed", res.status);

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const name = match ? match[1] : fallbackName;

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** What `apiShare` did, so callers can tell the user something accurate. */
export type ShareOutcome = "shared" | "cancelled" | "downloaded";

/**
 * Hand a generated PDF to the OS share sheet — WhatsApp, email, anywhere.
 *
 * The Web Share API only accepts files over HTTPS and only on browsers that
 * implement `canShare({files})`, which in practice means mobile Chrome/Safari
 * and not most desktops. Rather than hiding the button where it will not work,
 * this falls back to a plain download so the admin always ends up with the PDF
 * and can attach it by hand — the same compromise `lib/whatsapp.ts` documents,
 * since a wa.me link cannot carry an attachment.
 */
export async function apiShare(
  path: string,
  fallbackName: string,
  shareTitle: string,
  shareText?: string
): Promise<ShareOutcome> {
  const headers: Record<string, string> = {};
  if (tokenStore.access) headers["Authorization"] = `Bearer ${tokenStore.access}`;

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) throw new ApiError("Could not fetch the document", res.status);

  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = disposition.match(/filename="?([^"]+)"?/);
  const name = match ? match[1] : fallbackName;

  const file = new File([blob], name, { type: "application/pdf" });
  const nav = typeof navigator !== "undefined" ? navigator : undefined;

  if (nav?.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: shareTitle, text: shareText });
      return "shared";
    } catch (err) {
      // The user dismissing the sheet throws AbortError. That is not a
      // failure and must not trigger a fallback download they did not ask for.
      if (err instanceof DOMException && err.name === "AbortError") {
        return "cancelled";
      }
      // Anything else (permission, unsupported payload) still deserves the PDF.
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return "downloaded";
}
