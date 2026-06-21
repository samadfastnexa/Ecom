import Constants from 'expo-constants';

/**
 * Resolve the base API URL.
 *
 * Priority:
 *   1. `apiUrl`   — a full URL (e.g. the live HTTPS backend). Highest priority.
 *   2. `apiHost` + `apiPort` — for local dev against a LAN backend
 *      (builds `http://host:port/api`).
 *   3. The live backend as the default, so production builds and Expo Go
 *      hit the deployed API out of the box.
 *
 * All values come from Expo config `extra` (set in app.config.js from .env).
 */
const LIVE_API_URL = 'https://century.zipnixtechnologies.com/api';

const resolveApiUrl = (): string => {
    const extra = Constants.expoConfig?.extra;

    // 1. Explicit full API URL (live backend or any custom override).
    const fullUrl = extra?.apiUrl;
    if (fullUrl) {
        return String(fullUrl).replace(/\/+$/, '');
    }

    // 2. Host:port for local development against a LAN backend.
    const host = extra?.apiHost;
    const port = extra?.apiPort;
    if (host && port) {
        return `http://${host}:${port}/api`;
    }

    // 3. Default: the deployed live backend.
    return LIVE_API_URL;
};

export const API_URL = resolveApiUrl();

if (__DEV__) {
    console.log('🌐 API URL:', API_URL);
}
