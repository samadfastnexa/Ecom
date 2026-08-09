"""Push-notification transport hardening."""

from unittest.mock import patch

import requests
from django.test import SimpleTestCase

from core.notifications import send_push_notification


class SendPushNotificationTests(SimpleTestCase):
    """send_push_notification runs inside order-save paths, so it must never
    hang or raise no matter what the Expo endpoint does."""

    def test_post_carries_a_timeout(self):
        """Without a timeout a stalled Expo endpoint hangs the order save."""
        with patch('core.notifications.requests.post') as post:
            post.return_value.json.return_value = {'data': {'status': 'ok'}}
            send_push_notification('ExponentPushToken[x]', 'Title', 'Body')
        self.assertEqual(post.call_args.kwargs.get('timeout'), 10)

    def test_network_failure_is_swallowed(self):
        """A RequestException must come back as None, never propagate into
        the order save that triggered the notification."""
        with patch(
            'core.notifications.requests.post',
            side_effect=requests.exceptions.ConnectionError('unreachable'),
        ):
            self.assertIsNone(
                send_push_notification('ExponentPushToken[x]', 'Title', 'Body')
            )

    def test_timeout_error_is_swallowed(self):
        with patch(
            'core.notifications.requests.post',
            side_effect=requests.exceptions.Timeout('too slow'),
        ):
            self.assertIsNone(
                send_push_notification('ExponentPushToken[x]', 'Title', 'Body')
            )

    def test_empty_token_sends_nothing(self):
        with patch('core.notifications.requests.post') as post:
            self.assertIsNone(send_push_notification('', 'Title', 'Body'))
        post.assert_not_called()
