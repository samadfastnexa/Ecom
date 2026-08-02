require('dotenv').config();

module.exports = {
  expo: {
    // User-facing app label — this is what appears under the icon on the home
    // screen and in the app switcher. `slug` stays as-is: it identifies the
    // project on EAS and changing it would orphan the existing builds.
    name: "Century Sip",
    slug: "mobile-app",
    owner: "samadfastnexa",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    jsEngine: "hermes",
    newArchEnabled: false,
    // Custom URL scheme — expo-auth-session needs this to catch Google's
    // redirect back into the app. Without it the browser opens, the user signs
    // in, and nothing ever returns. Changing it invalidates existing OAuth
    // redirect URIs, so keep it stable once released.
    scheme: "centurysip",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      // Required before an iOS OAuth client can be created in Google Cloud.
      // Permanent once published to the App Store — do not change after release.
      bundleIdentifier: "com.centurysip.store"
    },
    android: {
      // Permanent once published to the Play Store — a rename after release
      // means a brand-new listing with no installs, reviews or ratings.
      package: "com.centurysip.store",
      // Firebase config — required so the native app can initialize Firebase
      // and obtain an FCM push token. Must be rebuilt after adding this.
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      "expo-web-browser",
      "expo-notifications"
    ],
    extra: {
      // Full API URL wins and defaults to the live backend, so the app uses
      // the deployed API out of the box. For local dev against a LAN backend,
      // set API_HOST in .env (then host:port is used instead of the live URL).
      apiUrl:
        process.env.API_URL ||
        (process.env.API_HOST ? null : "https://century.zipnixtechnologies.com/api"),
      apiHost: process.env.API_HOST || null,
      apiPort: process.env.API_PORT || "8002",
      // Google OAuth client IDs (Google Cloud Console → Credentials, project
      // ecom-c08aa). These are public identifiers, not secrets, but they differ
      // per environment so they come from .env rather than being committed.
      googleWebClientId: process.env.GOOGLE_WEB_CLIENT_ID || "",
      googleAndroidClientId: process.env.GOOGLE_ANDROID_CLIENT_ID || "",
      googleIosClientId: process.env.GOOGLE_IOS_CLIENT_ID || "",
      // EAS project ID — required for push tokens (project @samadfastnexa/mobile-app).
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "32a63efa-d33b-4d87-97b9-e0b590501945"
      }
    }
  }
};
