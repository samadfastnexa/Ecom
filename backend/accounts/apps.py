from django.apps import AppConfig
from django.core.checks import Warning as CheckWarning, register


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        register(check_google_client_ids, 'security', deploy=True)


def check_google_client_ids(app_configs, **kwargs):
    """Flag a deployment that accepts Google tokens from any OAuth client."""
    from django.conf import settings

    if settings.DEBUG or getattr(settings, 'GOOGLE_ALLOWED_CLIENT_IDS', []):
        return []

    return [
        CheckWarning(
            'Google sign-in accepts tokens from any OAuth client.',
            hint=(
                'Set GOOGLE_ALLOWED_CLIENT_IDS in the environment to a '
                'comma-separated list of your own Google OAuth client IDs. '
                'Until then, an access token issued to any other Google app '
                'is accepted, letting that app sign in as any of its users.'
            ),
            id='accounts.W001',
        )
    ]
