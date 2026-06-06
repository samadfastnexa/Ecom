#!/usr/bin/env bash
# Start the Django backend dev server using the host/port from backend/.env
set -e

# Always run from the backend directory (where this script lives)
cd "$(dirname "$0")"

# Load BACKEND_HOST / BACKEND_PORT from .env if present
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

HOST="${BACKEND_HOST:-0.0.0.0}"
PORT="${BACKEND_PORT:-8001}"

# Activate the virtual environment (Git Bash on Windows vs Linux/Mac)
if [ -f venv/Scripts/activate ]; then
  source venv/Scripts/activate
elif [ -f venv/bin/activate ]; then
  source venv/bin/activate
fi

echo "🚀 Starting Django backend on ${HOST}:${PORT}"
python manage.py runserver "${HOST}:${PORT}"
