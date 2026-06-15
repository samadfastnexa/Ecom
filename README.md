# E-commerce App

A full-stack e-commerce application with Django backend and React Native Expo frontend.

## 🚀 Quick Start

### Start Both Servers (One Command)

**PowerShell:**
```powershell
.\start.ps1
```

**Command Prompt:**
```cmd
start.bat
```

This starts both backend (port 8001) and frontend automatically!

---

## 📋 Features

- 🛍️ Product catalog with categories
- 🛒 Shopping cart
- 📦 Order management
- 💬 Customer support/complaints
- 🌍 Multi-language support
- 🔐 JWT authentication
- 📱 Mobile-first design

---

## 🛠️ Tech Stack

**Backend:**
- Django 6.0.1
- Django REST Framework
- PostgreSQL
- JWT Authentication

**Frontend:**
- React Native
- Expo SDK 54
- TypeScript
- React Navigation

---

## 📖 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Complete setup and usage guide
- **[DEPENDENCIES.md](DEPENDENCIES.md)** - Dependency management
- **[NETWORK_CONFIG.md](mobile-app/NETWORK_CONFIG.md)** - Network setup for devices

---

## 🔧 Manual Setup

### Backend
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver 0.0.0.0:8001
```

### Frontend
```bash
cd mobile-app
npm install
npm run update-ip  # Update IP for your network
npm start
```

---

## 📱 Testing

**Android Emulator:**
```bash
npm run android
```

**iOS Simulator:**
```bash
npm run ios
```

**Physical Device:**
1. Install Expo Go app
2. Run `npm run update-ip` in mobile-app folder
3. Scan QR code from `npm start`

---

## 🌐 Network Configuration

The app automatically detects your network:
- **Emulators**: Work automatically
- **Physical devices**: Run `npm run update-ip` when switching networks

---

## 📂 Project Structure

```
ecom-app/
├── backend/              # Django backend
│   ├── accounts/         # User authentication
│   ├── products/         # Product management
│   ├── orders/           # Order processing
│   ├── support/          # Customer support
│   └── requirements.txt  # Python dependencies
├── mobile-app/           # React Native frontend
│   ├── src/
│   │   ├── screens/      # App screens
│   │   ├── components/   # Reusable components
│   │   ├── services/     # API services
│   │   └── navigation/   # Navigation setup
│   └── package.json      # Node dependencies
├── start.ps1             # PowerShell startup script
├── start.bat             # Batch startup script
└── README.md             # This file
```

---

## 🔑 Default Admin Credentials

After running `createsuperuser`, access admin panel at:
- **URL**: http://localhost:8001/admin
- **Username**: (your created username)
- **Password**: (your created password)

---

## 🐛 Troubleshooting

### Port Already in Use
```powershell
netstat -ano | findstr :8001
taskkill /PID <PID> /F
```

### Cannot Connect to Backend
1. Check `.env` file: `API_PORT=8001`
2. Restart Expo: `npm start`
3. Verify backend is running: http://localhost:8001/admin

### Network Issues
```bash
cd mobile-app
npm run update-ip
npm start
```

See **[QUICKSTART.md](QUICKSTART.md)** for detailed troubleshooting.

---

## 📝 License

This project is for educational purposes.

---

## 👥 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

---

## 📞 Support

For issues and questions, create an issue in the repository.
