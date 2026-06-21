require('dotenv').config();

module.exports = {
  expo: {
    name: "mobile-app",
    slug: "mobile-app",
    owner: "samadfastnexa",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    jsEngine: "hermes",
    newArchEnabled: false,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true
    },
    android: {
      package: "com.zipnixtechnologies.century",
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
      // EAS project ID — required for push tokens (project @samadfastnexa/mobile-app).
      eas: {
        projectId: process.env.EAS_PROJECT_ID || "32a63efa-d33b-4d87-97b9-e0b590501945"
      }
    }
  }
};
