from pathlib import Path
import os

# Load .env from the backend directory
_ENV_PATH = Path(__file__).resolve().parent.parent / '.env'
if _ENV_PATH.exists():
    with open(_ENV_PATH) as _f:
        for _line in _f:
            _line = _line.strip()
            if _line and not _line.startswith('#') and '=' in _line:
                _k, _v = _line.split('=', 1)
                os.environ.setdefault(_k.strip(), _v.strip())

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: don't run with debug turned on in production!
# Set DEBUG=False in the environment on the server.
DEBUG = os.environ.get('DEBUG', 'True').strip().lower() in ('true', '1', 'yes')

# SECRET_KEY must come from the environment in production. The insecure fallback
# is used only for local development (DEBUG=True) — never in production, where a
# known key would let anyone forge JWT/session tokens.
SECRET_KEY = os.environ.get('SECRET_KEY')
if not SECRET_KEY:
    if DEBUG:
        SECRET_KEY = 'django-insecure-dev-key-for-now'
    else:
        raise RuntimeError('SECRET_KEY environment variable must be set when DEBUG=False.')

# Comma-separated list in the environment, e.g.
# ALLOWED_HOSTS=century.zipnixtechnologies.com
# In production (DEBUG=False) it must be set explicitly — no wildcard fallback.
ALLOWED_HOSTS = [
    h.strip()
    for h in os.environ.get('ALLOWED_HOSTS', '*' if DEBUG else '').split(',')
    if h.strip()
]

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party apps
    'rest_framework',
    'corsheaders',
    # Local apps
    'products',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'accounts',
    'orders',
    'support',
    'localization',
    'plant',
    'activities',
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # Fail-safe default: anonymous users can read, but any write requires auth.
    # Views needing stricter access set permission_classes explicitly (IsStaff,
    # etc.); public-write endpoints (register/login) set AllowAny explicitly.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle'
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10/minute',
        'user': '100/minute'
    }
}

from datetime import timedelta
SIMPLE_JWT = {
    # Short-lived access token: limits the damage window if one is stolen.
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    # Long, *sliding* refresh token. With rotation enabled, every refresh issues
    # a fresh 90-day refresh token, so an active user effectively never gets
    # logged out (Facebook/Instagram-style); only ~90 days of inactivity ends it.
    'REFRESH_TOKEN_LIFETIME': timedelta(days=90),
    'ROTATE_REFRESH_TOKENS': True,
    # Old refresh tokens are blacklisted after rotation, so a leaked one can't be
    # reused once the client has refreshed. (Requires the token_blacklist app.)
    'BLACKLIST_AFTER_ROTATION': True,
}

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    # WhiteNoise serves static files in production (must be right after SecurityMiddleware)
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Custom middleware for request logging
    'core.middleware.RequestLoggingMiddleware',
]

# CORS: allow any origin only in local dev. In production, restrict to the known
# web front-ends (override via the CORS_ALLOWED_ORIGINS env var, comma-separated).
# Note: CORS is a browser protection — the mobile app is unaffected either way.
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOW_ALL_ORIGINS = False
    CORS_ALLOWED_ORIGINS = [
        o.strip()
        for o in os.environ.get(
            'CORS_ALLOWED_ORIGINS',
            'https://admin.zipnixtechnologies.com,https://century.zipnixtechnologies.com',
        ).split(',')
        if o.strip()
    ]

# Production security hardening (only applied when DEBUG is off).
if not DEBUG:
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    SECURE_HSTS_SECONDS = 31536000  # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    # Trust the proxy's forwarded-proto header (LiteSpeed/Passenger terminate TLS).
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    # Opt-in via env — leave off by default to avoid redirect loops if the proxy
    # doesn't forward the scheme. Set SECURE_SSL_REDIRECT=True once verified.
    SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False').strip().lower() in ('true', '1', 'yes')

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Database
# DB_ENGINE switches between local dev (Postgres) and shared hosting (MySQL,
# since cPanel shared hosting typically has no PostgreSQL available).
DB_ENGINE = os.environ.get('DB_ENGINE', 'postgresql')

if DB_ENGINE == 'mysql':
    import pymysql
    # Django 6.0's MySQL backend requires mysqlclient >= 2.2.1. PyMySQL impersonates
    # MySQLdb but reports its own version (1.4.6), failing that check. Spoof the
    # version so PyMySQL is accepted (PyMySQL is fully compatible for our use).
    pymysql.version_info = (2, 2, 1, "final", 0)
    pymysql.install_as_MySQLdb()
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': os.environ.get('DB_NAME', 'century'),
            'USER': os.environ.get('DB_USER', 'root'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '3306'),
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': os.environ.get('DB_NAME', 'century'),
            'USER': os.environ.get('DB_USER', 'postgres'),
            'PASSWORD': os.environ.get('DB_PASSWORD', ''),
            'HOST': os.environ.get('DB_HOST', 'localhost'),
            'PORT': os.environ.get('DB_PORT', '5432'),
        }
    }

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
# Destination collectstatic writes to (served by WhiteNoise in production)
STATIC_ROOT = BASE_DIR / 'staticfiles'

# WhiteNoise: compressed static file serving without a separate web server
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Media files
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Logging configuration
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
        },
    },
    'loggers': {
        'api': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
