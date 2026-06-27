# Century Sip — Mobile App (Expo / React Native)

Expo SDK 54 app for customers, delivery riders, and admins. Push notifications via FCM (Expo Push).

## Stack
- Expo SDK 54, React Native 0.81, TypeScript, React Navigation
- `expo-notifications` (FCM), `expo-image-picker`, JWT auth with auto-refresh

## Local setup
```bash
npm install
copy .env.example .env             # optional
npx expo start -c                  # start Metro (use a dev client / Expo Go)
```

## Choosing the backend
One switch at the top of [`src/constants/config.ts`](src/constants/config.ts):
```ts
const USE_LOCAL = false;           // true → your local backend ; false → live server
const LOCAL_HOST = '192.168.x.x';  // your PC's LAN IP (run `ipconfig`)
```
- **Local dev (physical phone):** set `USE_LOCAL = true` and `LOCAL_HOST` to your PC's LAN IP. Run Django on `0.0.0.0:8002` and allow port 8002 through the firewall.
- **Shareable / production build:** keep `USE_LOCAL = false` (uses the live HTTPS backend).

## Building a shareable APK
```bash
eas build --platform android --profile preview
```
Standalone APK (no Metro needed). Reuses the keystore + FCM credentials. The root `.easignore` keeps the upload small.

## Push notifications
Requires `google-services.json` (committed, safe to embed) and the EAS project ID in `app.config.js`. The token is registered to the logged-in user after login (see `src/services/notificationService.ts`).

## Layout
- `src/screens/` — screens (incl. `admin/` panel); `src/services/` — API/auth/notifications
- `src/context/AuthContext.tsx` — auth state + token storage; `src/components/` — shared UI
