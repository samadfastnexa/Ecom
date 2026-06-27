import logging
import json
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('api')

# Any field whose name contains one of these (case-insensitive) is masked
# before logging, so credentials/tokens never hit the logs.
SENSITIVE_KEY_HINTS = ('password', 'token', 'secret', 'authorization', 'access', 'refresh')


def _mask_sensitive(value):
    """Recursively replace values of sensitive-looking keys with a placeholder."""
    if isinstance(value, dict):
        return {
            k: ('***HIDDEN***' if any(h in str(k).lower() for h in SENSITIVE_KEY_HINTS)
                else _mask_sensitive(v))
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_mask_sensitive(v) for v in value]
    return value


class RequestLoggingMiddleware(MiddlewareMixin):
    """
    Middleware to log all incoming API requests with detailed information
    """

    def process_request(self, request):
        # Only log API requests
        if request.path.startswith('/api/'):
            # Get user info
            user = getattr(request, 'user', None)
            username = user.username if user and user.is_authenticated else 'Anonymous'

            # Get request body for POST/PUT/PATCH
            body = None
            if request.method in ['POST', 'PUT', 'PATCH']:
                try:
                    if request.body:
                        body = _mask_sensitive(json.loads(request.body))
                except:
                    body = '<unparsed/non-JSON body>' if request.body else None

            # Log the request
            logger.info(f"""
┌─────────────────────────────────────────────────────────
│ 📱 FRONTEND REQUEST
├─────────────────────────────────────────────────────────
│ Method:  {request.method}
│ Path:    {request.path}
│ User:    {username}
│ IP:      {request.META.get('REMOTE_ADDR', 'Unknown')}
│ Body:    {json.dumps(body, indent=2) if body else 'No body'}
└─────────────────────────────────────────────────────────
""")

        return None

    def process_response(self, request, response):
        # Only log API responses
        if request.path.startswith('/api/'):
            status = response.status_code
            status_emoji = '✅' if 200 <= status < 300 else '⚠️' if 300 <= status < 400 else '❌'

            logger.info(f"""
┌─────────────────────────────────────────────────────────
│ 📤 BACKEND RESPONSE
├─────────────────────────────────────────────────────────
│ Status:  {status_emoji} {status}
│ Path:    {request.path}
│ Method:  {request.method}
└─────────────────────────────────────────────────────────
""")

        return response
