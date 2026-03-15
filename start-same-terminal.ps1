# Start both backend and frontend in the SAME terminal using concurrently

Write-Host "🚀 Starting E-commerce App (Same Terminal)..." -ForegroundColor Green
Write-Host ""

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
    Set-Location ..
}

# Check if concurrently is installed
$concurrentlyInstalled = npm list -g concurrently 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "📦 Installing concurrently globally..." -ForegroundColor Yellow
    npm install -g concurrently
}

Write-Host "📦 Starting Django Backend on port 8001..." -ForegroundColor Cyan
Write-Host "📱 Starting Expo Frontend..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop both servers" -ForegroundColor Yellow
Write-Host ""

# Run both servers concurrently in same terminal
npx concurrently -n "BACKEND,FRONTEND" -c "blue,magenta" `
    "cd backend && .\venv\Scripts\Activate.ps1 && python manage.py runserver 0.0.0.0:8001" `
    "cd mobile-app && npm start"
