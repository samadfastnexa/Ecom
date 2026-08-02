import Constants from 'expo-constants';

/* ============================================================================
 *  Google OAuth client IDs
 *  ---------------------------------------------------------------------------
 *  Created in Google Cloud Console → APIs & Services → Credentials, inside the
 *  EXISTING project `ecom-c08aa` (the same project as google-services.json —
 *  a Firebase project is a Google Cloud project, so don't make a second one).
 *
 *  Set these in mobile-app/.env (see .env.example); app.config.js passes them
 *  through to `extra`. They are public identifiers, not secrets — the reason
 *  they live in .env is that they differ per environment.
 *
 *    GOOGLE_WEB_CLIENT_ID      Web application client. Required on every
 *                              platform: expo-auth-session uses it as the
 *                              base clientId, and the Next.js site shares it.
 *    GOOGLE_ANDROID_CLIENT_ID  Android client. Needs package name
 *                              `com.centurysip.store` plus the SHA-1
 *                              from `eas credentials` (EAS signs with its own
 *                              key — a local debug keystore SHA-1 only works
 *                              for local builds).
 *    GOOGLE_IOS_CLIENT_ID      iOS client. Needs bundle identifier
 *                              `com.centurysip.store`.
 *
 *  The backend must also allow these IDs — set GOOGLE_ALLOWED_CLIENT_IDS in
 *  backend/.env to the same comma-separated list, or tokens are rejected.
 *
 *  ⚠️ Expo Go will NOT work. On SDK 54 the old auth.expo.io proxy is gone, so
 *     the redirect needs the app's own `scheme` (centurysip, set in
 *     app.config.js). Test with a development build:
 *         eas build --profile development --platform android
 * ==========================================================================*/

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const GOOGLE_WEB_CLIENT_ID = extra.googleWebClientId || '';
export const GOOGLE_ANDROID_CLIENT_ID = extra.googleAndroidClientId || '';
export const GOOGLE_IOS_CLIENT_ID = extra.googleIosClientId || '';

/**
 * Whether Google sign-in is usable in this build. The web client ID is the
 * minimum — without it the auth request can't be constructed, so the UI hides
 * the button instead of showing one that fails on tap.
 */
export const IS_GOOGLE_SIGNIN_CONFIGURED = Boolean(GOOGLE_WEB_CLIENT_ID);
