# Quick Start Guide

> The backend runs on **port 8002** (8001 is intentionally avoided). The web app runs on
> **port 3000**. The `start.*` convenience scripts launch the backend on the correct port.

## Starting the Application

### Backend
```bash
cd backend
.\venv\Scripts\activate            # Windows (Mac/Linux: source venv/bin/activate)
python manage.py runserver 0.0.0.0:8002
```

### Web (Next.js)
```bash
cd web
npm run dev                        # http://localhost:3000
```

### Mobile (Expo, in a new terminal)
```bash
cd mobile-app
npm start
```

The convenience scripts (`.\start.ps1`, `start.bat`, `.\start-same-terminal.ps1`) start
the backend + mobile app together on the correct ports.

---

## Stopping the Application

- **Same terminal / manual:** press `Ctrl+C` in each terminal.
- **Separate windows (start scripts):** close the spawned windows.

---

## Troubleshooting

### "Virtual environment not found"
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### "Node modules not found"
```bash
cd mobile-app && npm install
# or:  cd web && npm install
```

### "Port already in use" (backend)
```powershell
netstat -ano | findstr :8002
taskkill /PID <PID> /F
```

### "Cannot connect to backend" from the mobile app
1. Point the app at your backend — see [network-config.md](network-config.md). The
   simplest path is the `USE_LOCAL` toggle in `mobile-app/src/constants/config.ts`.
2. Make sure Django is bound to all interfaces: `runserver 0.0.0.0:8002`.
3. Restart Metro with a clean cache after config changes: `npx expo start -c`.
4. For a physical device, phone and computer must be on the same Wi-Fi.

---

## Network Configuration

Which backend the mobile app talks to is controlled by the **`USE_LOCAL`** toggle in
`mobile-app/src/constants/config.ts` — **not** by emulator auto-detection. See
[network-config.md](network-config.md) for the full explanation. In short:

- `USE_LOCAL = true` → `http://LOCAL_HOST:LOCAL_PORT/api` (set `LOCAL_HOST` to your PC's LAN IP; `LOCAL_PORT` is 8002).
- `USE_LOCAL = false` → the live server (or a full `API_URL` from `.env` for EAS builds).

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| **Backend** | `cd backend && .\venv\Scripts\activate && python manage.py runserver 0.0.0.0:8002` |
| **Web** | `cd web && npm run dev` |
| **Mobile** | `cd mobile-app && npm start` |
| **Mobile (clean cache)** | `cd mobile-app && npx expo start -c` |
| **Create admin** | `cd backend && python manage.py createsuperuser` |
| **Run migrations** | `cd backend && python manage.py migrate` |
| **Install backend deps** | `cd backend && pip install -r requirements.txt` |
| **Install web/mobile deps** | `npm install` (in `web/` or `mobile-app/`) |

---

## First-Time Setup

```bash
# Backend
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser

# Web
cd ../web && npm install

# Mobile
cd ../mobile-app && npm install
```

Then start each app as shown above.
