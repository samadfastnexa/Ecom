"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Spinner } from "@/components/ui";
import { GOOGLE_CLIENT_ID } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

const GIS_SRC = "https://accounts.google.com/gsi/client";

// ─── Google Identity Services typings (only the bits we use) ──────────────────

interface TokenResponse {
  access_token?: string;
  error?: string;
}

interface TokenClient {
  requestAccessToken: () => void;
}

interface GoogleAccounts {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type?: string }) => void;
      }) => TokenClient;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleAccounts;
  }
}

// ─── Script loader ────────────────────────────────────────────────────────────

let gisLoader: Promise<void> | null = null;

/** Inject the GIS script once and share the same promise across both forms. */
function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;

  gisLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoader = null; // allow a retry on the next click
      reject(new Error("Couldn't reach Google. Check your connection and try again."));
    };
    document.head.appendChild(script);
  });

  return gisLoader;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface GoogleSignInButtonProps {
  label?: string;
  /** Called after our own JWT session is established. */
  onAuthenticated: (profile: UserProfile | null) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}

/**
 * "Continue with Google" via the GIS token flow. Google returns an OAuth access
 * token in a popup, which the backend swaps for our JWT pair — the same
 * handshake the mobile app uses.
 *
 * Renders nothing when no client ID is configured, so a half-set-up deployment
 * doesn't show a button that always fails.
 */
export function GoogleSignInButton({
  label = "Continue with Google",
  onAuthenticated,
  onError,
  disabled,
}: GoogleSignInButtonProps) {
  const { loginWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  if (!GOOGLE_CLIENT_ID) return null;

  const exchangeToken = async (accessToken: string) => {
    try {
      const profile = await loginWithGoogle(accessToken);
      onAuthenticated(profile);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const start = async () => {
    onError("");
    setLoading(true);
    try {
      await loadGoogleIdentityServices();
      const oauth2 = window.google?.accounts?.oauth2;
      if (!oauth2) throw new Error("Google sign-in is unavailable right now.");

      oauth2
        .initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          callback: (response) => {
            if (!response.access_token) {
              setLoading(false);
              onError("Google didn't return an access token. Please try again.");
              return;
            }
            void exchangeToken(response.access_token);
          },
          // Fires when the popup is blocked or dismissed — without this the
          // button would stay stuck in its loading state.
          error_callback: (error) => {
            setLoading(false);
            onError(
              error?.type === "popup_failed_to_open"
                ? "Your browser blocked the Google popup. Allow popups for this site and retry."
                : "Google sign-in was cancelled."
            );
          },
        })
        .requestAccessToken();
    } catch (e) {
      setLoading(false);
      onError(e instanceof Error ? e.message : "Google sign-in failed.");
    }
  };

  return (
    <button
      type="button"
      onClick={start}
      disabled={disabled || loading}
      className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-mist transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? <Spinner size={16} /> : <GoogleMark />}
      {loading ? "Connecting…" : label}
    </button>
  );
}

/**
 * "OR" separator above the Google button. Hidden alongside the button when no
 * client ID is set, so an unconfigured deployment shows no dangling divider.
 */
export function GoogleDivider() {
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="my-5 flex items-center gap-3">
      <span className="h-px flex-1 bg-white/10" />
      <span className="text-xs font-semibold text-mist/40">OR</span>
      <span className="h-px flex-1 bg-white/10" />
    </div>
  );
}

/** Google's four-colour mark, inlined so nothing is fetched from a CDN. */
function GoogleMark() {
  return (
    <svg width="17" height="17" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
