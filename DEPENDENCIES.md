# Dependency Management Guide

## Backend Dependencies

### Installation
```bash
cd backend
pip install -r requirements.txt
```

### Current Packages (requirements.txt)

#### Django Core
- **Django 6.0.1** - Web framework
- **asgiref 3.11.0** - ASGI utilities
- **sqlparse 0.5.5** - SQL parser
- **tzdata 2025.3** - Timezone data

#### Django REST Framework
- **djangorestframework 3.16.1** - REST API framework
- **djangorestframework-simplejwt 5.4.0** - JWT authentication

#### Additional
- **django-cors-headers 4.6.0** - CORS support for API
- **Pillow 12.1.0** - Image processing

### Updating Backend Dependencies

**Update all packages:**
```bash
cd backend
.\venv\Scripts\activate  # Windows
pip install --upgrade -r requirements.txt
```

**Update specific package:**
```bash
pip install --upgrade Django
```

**Regenerate requirements.txt:**
```bash
pip freeze > requirements.txt
```

---

## Frontend Dependencies

### Installation
```bash
cd mobile-app
npm install
```

### Current Packages (package.json)

#### Core Dependencies
- **expo ~54.0.33** - Expo framework
- **react 19.1.0** - React library
- **react-native 0.81.5** - React Native framework

#### Navigation
- **@react-navigation/native ^7.1.28** - Navigation core
- **@react-navigation/native-stack ^7.11.0** - Stack navigator
- **@react-navigation/bottom-tabs ^7.10.1** - Tab navigator
- **react-native-screens ~4.16.0** - Native screen components
- **react-native-safe-area-context ^5.6.2** - Safe area handling

#### Expo Modules
- **expo-constants ^18.0.13** - App constants and config
- **expo-device ^8.0.10** - Device information
- **expo-notifications ^0.32.16** - Push notifications
- **expo-status-bar ~3.0.9** - Status bar control

#### UI & Icons
- **@expo/vector-icons ^15.0.3** - Icon library

#### Storage
- **@react-native-async-storage/async-storage ^2.2.0** - Async storage

#### Development Dependencies
- **typescript ~5.9.2** - TypeScript support
- **@types/react ~19.1.0** - React type definitions
- **jest ^30.2.0** - Testing framework
- **jest-expo ^54.0.17** - Expo Jest preset
- **@testing-library/react-native ^13.3.3** - Testing utilities
- **@testing-library/jest-native ^5.4.3** - Jest matchers
- **babel-preset-expo ^54.0.10** - Babel configuration
- **react-test-renderer ^19.1.0** - React test renderer

### Updating Frontend Dependencies

**Check for outdated packages:**
```bash
npm outdated
```

**Update all packages (respecting version ranges):**
```bash
npm update
```

**Update specific package:**
```bash
npm install expo@latest
```

**Update to latest versions (breaking changes possible):**
```bash
npx expo install --fix
```

**Audit for security vulnerabilities:**
```bash
npm audit
npm audit fix
```

---

## Version Control

### Backend
- ✅ `requirements.txt` - Tracked in git
- ❌ `venv/` - Excluded from git

### Frontend
- ✅ `package.json` - Tracked in git
- ✅ `package-lock.json` - Tracked in git
- ❌ `node_modules/` - Excluded from git

---

## Best Practices

### Backend
1. **Always use virtual environment** before installing packages
2. **Update requirements.txt** after installing new packages: `pip freeze > requirements.txt`
3. **Pin versions** for production stability
4. **Test after updates** to ensure compatibility

### Frontend
1. **Use `npm ci`** for clean installs in production/CI
2. **Commit `package-lock.json`** for consistent installs
3. **Test on both platforms** (iOS/Android) after updates
4. **Use Expo SDK versions** that are compatible with each other
5. **Run `npx expo-doctor`** to check for compatibility issues

---

## Troubleshooting

### Backend Issues

**Package conflicts:**
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

**Virtual environment issues:**
```bash
# Recreate virtual environment
deactivate
rm -rf venv
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend Issues

**Dependency conflicts:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Expo compatibility:**
```bash
# Check for issues
npx expo-doctor

# Fix Expo dependencies
npx expo install --fix
```

**Metro bundler cache:**
```bash
npm start -- --clear
```

---

## Quick Reference

| Task | Backend | Frontend |
|------|---------|----------|
| Install dependencies | `pip install -r requirements.txt` | `npm install` |
| Add new package | `pip install package-name` | `npm install package-name` |
| Update all | `pip install --upgrade -r requirements.txt` | `npm update` |
| Update specific | `pip install --upgrade package-name` | `npm install package-name@latest` |
| Save dependencies | `pip freeze > requirements.txt` | Automatic in `package.json` |
| Check outdated | `pip list --outdated` | `npm outdated` |
| Security audit | N/A | `npm audit` |
