// Google OAuth Client IDs
// Get these from: https://console.cloud.google.com → APIs & Services → Credentials
//
// Steps:
// 1. Create a project in Google Cloud Console
// 2. Enable "Google+ API" or "People API"
// 3. Create OAuth 2.0 Client IDs:
//    - Web application  → paste ID as GOOGLE_WEB_CLIENT_ID
//    - Android          → paste ID as GOOGLE_ANDROID_CLIENT_ID (use your app's SHA-1)
//    - iOS              → paste ID as GOOGLE_IOS_CLIENT_ID
//
// For Expo Go testing on Android, only GOOGLE_WEB_CLIENT_ID is needed.

export const GOOGLE_WEB_CLIENT_ID =
  'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

export const GOOGLE_ANDROID_CLIENT_ID =
  'YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com';

export const GOOGLE_IOS_CLIENT_ID =
  'YOUR_IOS_CLIENT_ID.apps.googleusercontent.com';
