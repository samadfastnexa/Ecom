# E-commerce App - Quick Start Guide

## Starting the Application

### Option 1: Single Command (Separate Windows - Recommended)

**Using PowerShell:**
```powershell
.\start.ps1
```

This opens **separate terminal windows** for backend and frontend.
- ✅ Easy to see logs separately
- ✅ Easy to stop individual servers
- ✅ Cleaner output

**Using Command Prompt:**
```cmd
start.bat
```

### Option 1b: Single Command (Same Terminal)

**Using PowerShell:**
```powershell
.\start-same-terminal.ps1
```

This runs **both servers in the same terminal**.
- ✅ All logs in one place
- ✅ Stop both with Ctrl+C
- ⚠️ Requires `concurrently` package (auto-installed)

### Option 2: Manual Start

**Backend:**
```bash
cd backend
.\venv\Scripts\activate
python manage.py runserver 0.0.0.0:8001
```

**Frontend (in new terminal):**
```bash
cd mobile-app
npm start
```

---

## Stopping the Application

### If using start scripts:
- **PowerShell**: Press `Ctrl+C` in the main terminal
- **Batch file**: Close the terminal windows

### If started manually:
- Press `Ctrl+C` in each terminal window

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
cd mobile-app
npm install
```

### "Port already in use"
**Find and kill process on port 8001:**
```powershell
# Find process
netstat -ano | findstr :8001

# Kill process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### "Cannot connect to backend"
1. Check `.env` file has correct port:
   ```
   API_PORT=8001
   ```
2. Restart Expo after changing `.env`:
   ```bash
   npm start
   ```

### "AbortError when fetching products"
1. Verify backend is running: `http://localhost:8001/admin`
2. Check API port matches in `.env`
3. Ensure you're on the same network (for physical devices)

---

## Network Configuration

### For Physical Devices (Phone/Tablet)

1. **Update IP address:**
   ```bash
   cd mobile-app
   npm run update-ip
   ```

2. **Restart Expo:**
   ```bash
   npm start
   ```

3. **Ensure backend is accessible:**
   - Backend must run on `0.0.0.0:8001` (not `127.0.0.1`)
   - Phone and computer must be on same WiFi

### For Emulators

No configuration needed! The app automatically uses:
- **Android Emulator**: `10.0.2.2:8001`
- **iOS Simulator**: `localhost:8001`

---

## Quick Commands Reference

| Task | Command |
|------|---------|
| **Start both** | `.\start.ps1` or `start.bat` |
| **Update IP** | `cd mobile-app && npm run update-ip` |
| **Backend only** | `cd backend && .\venv\Scripts\activate && python manage.py runserver 0.0.0.0:8001` |
| **Frontend only** | `cd mobile-app && npm start` |
| **Create admin** | `cd backend && python manage.py createsuperuser` |
| **Run migrations** | `cd backend && python manage.py migrate` |
| **Install backend deps** | `cd backend && pip install -r requirements.txt` |
| **Install frontend deps** | `cd mobile-app && npm install` |

---

## First Time Setup

1. **Backend setup:**
   ```bash
   cd backend
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   python manage.py migrate
   python manage.py createsuperuser
   ```

2. **Frontend setup:**
   ```bash
   cd mobile-app
   npm install
   npm run update-ip
   ```

3. **Start application:**
   ```bash
   # From root directory
   .\start.ps1
   ```

---

## Development Workflow

1. **Start servers**: `.\start.ps1`
2. **Make changes** to code
3. **Backend auto-reloads** on file changes
4. **Frontend auto-reloads** on file changes
5. **Test on device/emulator**
6. **Stop servers** when done

---

## Production Deployment

See `DEPENDENCIES.md` for production deployment guidelines.
