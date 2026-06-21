# 🌐 Network Configuration - Quick Start

## Problem Solved ✅
No more manually changing IP addresses in code when switching networks!

## How to Use

### First Time Setup
Your `.env` file is already configured with:
```env
API_HOST=192.168.100.17
API_PORT=8000
```

**To change the port:** Just edit `API_PORT` in `.env` - it's used everywhere automatically!

### When You Switch Networks (Home → Office → Café)

**Option 1: Automatic (Recommended)**
```bash
npm run update-ip
```
This automatically detects your new IP and updates `.env`

**Option 2: Manual**
1. Find your IP: `ipconfig` (Windows) or `ifconfig` (Mac/Linux)
2. Edit `.env` file:
   ```env
   API_HOST=YOUR_NEW_IP
   API_PORT=8000
   ```

### Then Restart Expo
```bash
npm start
```

## Testing Scenarios

### Android Emulator
```bash
npm run android
```
✅ Works automatically - no configuration needed

### iOS Simulator
```bash
npm run ios
```
✅ Works automatically - no configuration needed

### Physical Device (Phone/Tablet)
1. Connect to same WiFi as your computer
2. Run `npm run update-ip` (if IP changed)
3. Run `npm start`
4. Scan QR code with Expo Go

## Backend Setup

Make sure Django is running on all network interfaces:
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

## Troubleshooting

**"Network Error" on physical device?**
- Ensure both devices on same WiFi
- Run `npm run update-ip` to verify IP
- Check firewall allows port 8000

**Check current API URL:**
Look for this in your console when app starts:
```
🌐 API URL: http://192.168.100.202:8000/api
```

## Files Changed
- ✅ `src/constants/config.ts` - Smart API URL detection
- ✅ `.env` - Your network-specific configuration
- ✅ `.env.example` - Template for other developers
- ✅ `update-ip.js` - Auto IP detection helper
- ✅ `.gitignore` - Excludes `.env` from git

📖 **Full documentation:** See `network_setup_guide.md` in artifacts
