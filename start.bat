@echo off
REM Start both backend and frontend servers

echo.
echo ========================================
echo   Starting E-commerce App
echo ========================================
echo.

REM Check if virtual environment exists
if not exist "backend\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found!
    echo Please create it first: python -m venv backend\venv
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "mobile-app\node_modules" (
    echo [WARNING] Node modules not found. Installing...
    cd mobile-app
    call npm install
    cd ..
)

echo [INFO] Starting Django Backend on port 8001...
start "Django Backend" cmd /k "cd backend && venv\Scripts\activate && python manage.py runserver 0.0.0.0:8001"

REM Wait for backend to start
timeout /t 3 /nobreak >nul

echo [INFO] Starting Expo Frontend...
start "Expo Frontend" cmd /k "cd mobile-app && npm start"

echo.
echo ========================================
echo   Both servers are starting!
echo ========================================
echo.
echo Backend:  http://localhost:8001
echo Frontend: Check Expo DevTools
echo.
echo Close the terminal windows to stop servers
echo.
pause
