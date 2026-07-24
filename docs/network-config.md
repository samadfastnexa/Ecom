# Mobile Network Configuration

How the Expo app decides which backend to talk to, and how to point it at a **local**
backend for development.

## The one switch: `USE_LOCAL`

All URL resolution lives in [`mobile-app/src/constants/config.ts`](../mobile-app/src/constants/config.ts).
The top of that file has a single toggle:

```ts
const USE_LOCAL = false;      // false → LIVE server, true → your local LAN backend
const LOCAL_HOST = '192.168.100.17';  // your PC's LAN IP (edit this)
const LOCAL_PORT = '8002';            // backend port (8001 is intentionally avoided)
```

Resolution order:

1. **`USE_LOCAL = true`** → the whole app uses `http://LOCAL_HOST:LOCAL_PORT/api`. This
   **wins over `.env`**. Set `LOCAL_HOST` to your computer's LAN IP.
2. **`USE_LOCAL = false`** → the app uses `API_URL` from `.env` if set (this is what EAS
   production builds use), otherwise the live backend
   `https://century.zipnixtechnologies.com/api`.

After changing any of this, restart Metro with a clean cache:

```bash
npx expo start -c
```

You can confirm the resolved URL in the dev console on launch:

```
🌐 API URL: http://192.168.100.17:8002/api  (LOCAL)
```

## Local development against your LAN backend

Pick **one** of these:

- **Recommended — the toggle:** set `USE_LOCAL = true` in `config.ts` and put your PC's
  IPv4 address in `LOCAL_HOST`. Find it with `ipconfig` (Windows) / `ifconfig` or
  `ip addr` (Mac/Linux).
- **Or a full URL via `.env`:** keep `USE_LOCAL = false` and set
  `API_URL=http://YOUR_IP:8002/api` in `mobile-app/.env` (copy from `.env.example`).

Requirements for a physical device:
- The phone and computer are on the **same Wi-Fi** (no client isolation).
- Django is bound to all interfaces: `python manage.py runserver 0.0.0.0:8002`.
- The firewall allows inbound connections on port **8002**.

> ⚠️ **Note on `.env` `API_HOST` / `API_PORT`:** these are read by `app.config.js` but
> `config.ts` currently only consumes a full `API_URL` (or the `USE_LOCAL` toggle).
> Setting `API_HOST`/`API_PORT` **alone** will fall back to the live server. Use
> `USE_LOCAL` or a full `API_URL` instead. `npm run update-ip` only rewrites the
> (now largely unused) `API_HOST`/`API_PORT` lines in `.env`, so prefer the toggle.

## Relevant files

- `src/constants/config.ts` — the `USE_LOCAL` toggle and URL resolution
- `app.config.js` — exposes `extra.apiUrl` (default live backend) to the app
- `.env` / `.env.example` — optional `API_URL` for custom/local backends (git-ignored)
- `update-ip.js` (`npm run update-ip`) — writes your detected IP into `.env` (see the note above)
