# Start both backend and frontend servers concurrently

Write-Host "🚀 Starting E-commerce App..." -ForegroundColor Green
Write-Host ""

# Get current directory
$rootDir = Get-Location

# Check if virtual environment exists
if (-Not (Test-Path "backend\venv\Scripts\Activate.ps1")) {
    Write-Host "❌ Virtual environment not found!" -ForegroundColor Red
    Write-Host "Please create it first: python -m venv backend\venv" -ForegroundColor Yellow
    exit 1
}

# Check if node_modules exists
if (-Not (Test-Path "mobile-app\node_modules")) {
    Write-Host "⚠️  Node modules not found. Installing..." -ForegroundColor Yellow
    Set-Location mobile-app
    npm install
    Set-Location $rootDir
}

Write-Host "📦 Starting Django Backend on port 8001..." -ForegroundColor Cyan
Write-Host "📱 Starting Expo Frontend..." -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Servers are starting in new windows!" -ForegroundColor Green
Write-Host ""
Write-Host "Backend:  http://localhost:8001/admin" -ForegroundColor White
Write-Host "Frontend: Check Expo DevTools window" -ForegroundColor White
Write-Host ""
Write-Host "To stop: Close the terminal windows" -ForegroundColor Yellow
Write-Host ""

# Start backend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\backend'; .\venv\Scripts\Activate.ps1; python manage.py runserver 0.0.0.0:8001"

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start frontend in new window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$rootDir\mobile-app'; npm start"

Write-Host "✅ Done! Check the new terminal windows." -ForegroundColor Green
