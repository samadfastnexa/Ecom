"""Admin-created customers: optional password, split address, shared policy."""

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status as http
from rest_framework.test import APIClient

from .models import Area

CREATE_URL = '/api/auth/admin/customers/create/'
REGISTER_URL = '/api/auth/register/'


class AdminCustomerCreateTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='custadmin', password='AdminPass1!', is_staff=True,
        )
        self.client.force_authenticate(self.admin)
        Area.objects.create(name='Johar Town')

    def test_password_may_be_omitted_for_internal_customers(self):
        """A walk-in customer is a record, not a login — no password needed."""
        res = self.client.post(CREATE_URL, {'username': 'walkin1'}, format='json')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertFalse(res.data['can_sign_in'])

        user = User.objects.get(username='walkin1')
        self.assertFalse(user.has_usable_password())

    def test_omitted_password_cannot_be_used_to_log_in(self):
        self.client.post(CREATE_URL, {'username': 'walkin2'}, format='json')
        user = User.objects.get(username='walkin2')
        # An unusable password must not match anything, empty string included.
        self.assertFalse(user.check_password(''))
        self.assertFalse(user.check_password('password'))

    def test_supplied_password_must_meet_the_signup_policy(self):
        """The old rule here was 6 characters with no character requirements."""
        res = self.client.post(
            CREATE_URL, {'username': 'weakpw', 'password': 'abc123'}, format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
        self.assertIn('password', res.data)
        self.assertFalse(User.objects.filter(username='weakpw').exists())

    def test_strong_password_is_accepted_and_usable(self):
        res = self.client.post(
            CREATE_URL,
            {'username': 'stronguser', 'password': 'Str0ng!Pass'},
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertTrue(res.data['can_sign_in'])
        self.assertTrue(
            User.objects.get(username='stronguser').check_password('Str0ng!Pass')
        )

    def test_address_parts_are_stored_and_composed(self):
        res = self.client.post(
            CREATE_URL,
            {
                'username': 'addrcust',
                'house_number': 'H-12',
                'portion': 'upper',
                'block': 'Block 6',
                'area': 'Johar Town',
            },
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        profile = User.objects.get(username='addrcust').profile
        self.assertEqual(profile.house_number, 'H-12')
        self.assertEqual(profile.area, 'Johar Town')
        # Portion is stored as a key so it can be grouped; the composed line
        # carries the human label.
        self.assertEqual(profile.portion, 'upper')
        self.assertEqual(profile.address, 'H-12, Upper, Block 6, Johar Town')

    def test_free_text_portion_is_normalised(self):
        res = self.client.post(
            CREATE_URL,
            {'username': 'legacyportion', 'house_number': 'H-1',
             'portion': 'GF', 'area': 'Johar Town'},
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        profile = User.objects.get(username='legacyportion').profile
        self.assertEqual(profile.portion, 'ground')

    def test_customer_may_be_created_with_no_address_at_all(self):
        res = self.client.post(CREATE_URL, {'username': 'noaddr'}, format='json')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertFalse(User.objects.get(username='noaddr').profile.address)

    def test_legacy_single_address_still_accepted(self):
        res = self.client.post(
            CREATE_URL,
            {'username': 'legacyaddr', 'address': 'H-9, Model Town'},
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        profile = User.objects.get(username='legacyaddr').profile
        self.assertEqual(profile.address, 'H-9, Model Town')

    def test_parts_win_over_a_supplied_single_address(self):
        res = self.client.post(
            CREATE_URL,
            {
                'username': 'bothaddr',
                'address': 'stale text',
                'house_number': 'H-1',
                'area': 'Johar Town',
            },
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertEqual(
            User.objects.get(username='bothaddr').profile.address, 'H-1, Johar Town',
        )

    def test_duplicate_username_is_rejected_case_insensitively(self):
        User.objects.create_user(username='taken', password='Str0ng!Pass')
        res = self.client.post(CREATE_URL, {'username': 'TAKEN'}, format='json')
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
        self.assertIn('username', res.data)

    def test_non_staff_cannot_create_customers(self):
        self.client.force_authenticate(
            User.objects.create_user(username='plain', password='Str0ng!Pass')
        )
        res = self.client.post(CREATE_URL, {'username': 'sneaky'}, format='json')
        self.assertIn(
            res.status_code,
            (http.HTTP_403_FORBIDDEN, http.HTTP_401_UNAUTHORIZED),
        )
        self.assertFalse(User.objects.filter(username='sneaky').exists())


class PasswordPolicyParityTests(TestCase):
    """Signup and admin-created customers must reject the same passwords."""

    # Each fails exactly one rule: too short, no uppercase, no lowercase,
    # no digit, no special character.
    WEAK = ['Sh1!aaa', 'alllowercase1!', 'ALLUPPERCASE1!', 'NoDigitsHere!!', 'NoSpecial1x']

    def setUp(self):
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='parityadmin', password='AdminPass1!', is_staff=True,
        )

    def test_admin_endpoint_rejects_what_signup_rejects(self):
        for index, password in enumerate(self.WEAK):
            with self.subTest(password=password):
                self.client.force_authenticate(None)
                signup = self.client.post(
                    REGISTER_URL,
                    {
                        'username': f'signup{index}',
                        'email': f'signup{index}@example.com',
                        'password': password,
                        'password_confirm': password,
                        'phone_number': '03001234567',
                        'house_number': 'H-1',
                        'area': 'Johar Town',
                    },
                    format='json',
                )
                self.client.force_authenticate(self.admin)
                admin_created = self.client.post(
                    '/api/auth/admin/customers/create/',
                    {'username': f'admin{index}', 'password': password},
                    format='json',
                )
                self.assertEqual(signup.status_code, http.HTTP_400_BAD_REQUEST)
                self.assertEqual(admin_created.status_code, http.HTTP_400_BAD_REQUEST)
