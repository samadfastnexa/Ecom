import logging
import json
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger('api')


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
                        body = json.loads(request.body)
                        # Hide sensitive data
                        if 'password' in body:
                            body['password'] = '***HIDDEN***'
                        if 'token' in body:
                            body['token'] = '***HIDDEN***'
                except:
                    body = request.body.decode('utf-8')[:100] if request.body else None

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
