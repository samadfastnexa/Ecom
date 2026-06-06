#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent


def load_env():
    """Load simple KEY=VALUE pairs from a .env file into os.environ.

    Existing environment variables are NOT overwritten, so values set in the
    shell (or CI) still take precedence over the .env file.
    """
    env_path = BASE_DIR / '.env'
    if not env_path.exists():
        return
    for raw_line in env_path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, _, value = line.partition('=')
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    load_env()

    # When `runserver` is called without an explicit address/port, default it
    # to BACKEND_HOST:BACKEND_PORT from the .env file.
    if len(sys.argv) >= 2 and sys.argv[1] == 'runserver':
        has_address = any(not arg.startswith('-') for arg in sys.argv[2:])
        if not has_address:
            host = os.environ.get('BACKEND_HOST', '0.0.0.0')
            port = os.environ.get('BACKEND_PORT', '8001')
            sys.argv.append(f'{host}:{port}')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
