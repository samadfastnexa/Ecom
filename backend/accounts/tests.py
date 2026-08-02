from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework import status as http_status

class AuthenticationTests(TestCase):
    def setUp(self):
        # DRF throttle state lives in the cache and leaks between tests,
        # which would 429 later cases (anon rate is 10/minute).
        cache.clear()
        self.client = APIClient()
        self.register_url = '/api/auth/register/'
        self.login_url = '/api/auth/login/'
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'Password123!',
            'password_confirm': 'Password123!',
            'phone_number': '0300-1234567',
            'house_number': 'H-12',
            'portion': 'Ground Floor',
            'block_area': 'Block 6, Gulshan-e-Iqbal',
        }

    def test_registration(self):
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.count(), 1)
        self.assertEqual(User.objects.get().username, 'testuser')

    def test_registration_saves_phone_and_address_parts(self):
        self.client.post(self.register_url, self.user_data)
        profile = User.objects.get(username='testuser').profile
        self.assertEqual(profile.phone_number, '03001234567')  # normalized
        self.assertEqual(profile.house_number, 'H-12')
        self.assertEqual(profile.portion, 'Ground Floor')
        self.assertEqual(profile.block_area, 'Block 6, Gulshan-e-Iqbal')
        self.assertEqual(
            profile.address, 'H-12, Ground Floor, Block 6, Gulshan-e-Iqbal'
        )

    def test_portion_is_optional(self):
        data = self.user_data.copy()
        data.pop('portion')
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        profile = User.objects.get(username='testuser').profile
        self.assertEqual(profile.address, 'H-12, Block 6, Gulshan-e-Iqbal')

    def test_phone_and_address_are_required(self):
        for field in ('phone_number', 'house_number', 'block_area'):
            with self.subTest(field=field):
                data = self.user_data.copy()
                data.pop(field)
                response = self.client.post(self.register_url, data)
                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertIn(field, response.data)

    def test_registration_invalid_phone(self):
        data = self.user_data.copy()
        data['phone_number'] = '021-1234567'  # landline, not a mobile
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('phone_number', response.data)

    def test_registration_invalid_password(self):
        data = self.user_data.copy()
        data['password'] = 'weak'
        data['password_confirm'] = 'weak'
        response = self.client.post(self.register_url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login(self):
        # Register first
        self.client.post(self.register_url, self.user_data)
        
        # Login
        response = self.client.post(self.login_url, {
            'username': 'testuser',
            'password': 'Password123!'
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_duplicate_email(self):
        self.client.post(self.register_url, self.user_data)
        response = self.client.post(self.register_url, self.user_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)
