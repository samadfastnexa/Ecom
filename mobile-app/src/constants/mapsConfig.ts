import Constants from 'expo-constants';

/* ============================================================================
 *  Google Maps
 *  ---------------------------------------------------------------------------
 *  One key, two consumers:
 *
 *    JS   — this file, so the UI can tell whether a map is worth rendering.
 *    Native — app.config.js writes the same value into
 *             `android.config.googleMaps.apiKey`, which is what the Maps SDK
 *             for Android actually reads. Changing the key therefore needs a
 *             new native build, not just a Metro restart.
 *
 *  Enable BOTH "Maps SDK for Android" and "Maps SDK for iOS" on the key in
 *  Google Cloud Console → APIs & Services. A key with neither enabled returns
 *  a grey tile grid with no error the user can see.
 *
 *  The key is restricted by package name + SHA-1 rather than kept secret — it
 *  ships inside the APK and cannot be hidden, exactly like the OAuth client IDs.
 * ==========================================================================*/

const extra = (Constants.expoConfig?.extra ?? {}) as Record<string, string | undefined>;

export const GOOGLE_MAPS_API_KEY = extra.googleMapsApiKey || '';

/**
 * Whether a map can be drawn in this build. Without a key the Maps SDK renders
 * a blank grey square and logs an authorization failure the admin never sees,
 * so the UI falls back to the rider list instead of showing a broken map.
 */
export const IS_MAPS_CONFIGURED = Boolean(GOOGLE_MAPS_API_KEY);

/** Map centre when no rider has ever reported a position. */
export const FALLBACK_REGION = {
  latitude: 31.5204,
  longitude: 74.3587,
  latitudeDelta: 0.15,
  longitudeDelta: 0.15,
};
