from unittest import mock

from django.core.cache import cache
from django.test import TestCase, override_settings
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status
from rest_framework import status as http_status
from accounts.models import Area

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
            'block': 'Block 6',
            'area': 'Gulshan-e-Iqbal',
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
        self.assertEqual(profile.block, 'Block 6')
        self.assertEqual(profile.area, 'Gulshan-e-Iqbal')
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
        for field in ('phone_number', 'house_number', 'area'):
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


class AdminResetPasswordTests(TestCase):
    """Admin-initiated password resets for riders / staff."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='admin1', password='AdminPass1!', is_staff=True
        )
        self.rider = User.objects.create_user(
            username='rider1', password='OldRiderPass1!'
        )
        self.rider.profile.user_type = 'delivery_boy'
        self.rider.profile.is_rider = True
        self.rider.profile.save()
        self.url = f'/api/auth/admin/reset-password/{self.rider.id}/'

    def test_admin_sets_explicit_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url, {'new_password': 'BrandNewPass9!'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Not echoed back when the admin chose it themselves.
        self.assertIsNone(response.data['new_password'])
        self.rider.refresh_from_db()
        self.assertTrue(self.rider.check_password('BrandNewPass9!'))

    def test_admin_generates_temporary_password(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url, {'generate': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        generated = response.data['new_password']
        self.assertEqual(len(generated), 10)
        self.rider.refresh_from_db()
        self.assertTrue(self.rider.check_password(generated))

    def test_short_password_rejected(self):
        self.client.force_authenticate(self.admin)
        response = self.client.post(self.url, {'new_password': 'abc'})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.rider.refresh_from_db()
        self.assertTrue(self.rider.check_password('OldRiderPass1!'))

    def test_non_staff_cannot_reset(self):
        customer = User.objects.create_user(username='cust1', password='CustPass1!')
        self.client.force_authenticate(customer)
        response = self.client.post(self.url, {'new_password': 'Hijacked123!'})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.rider.refresh_from_db()
        self.assertTrue(self.rider.check_password('OldRiderPass1!'))

    def test_anonymous_cannot_reset(self):
        response = self.client.post(self.url, {'new_password': 'Hijacked123!'})
        self.assertIn(
            response.status_code,
            (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN),
        )
        self.rider.refresh_from_db()
        self.assertTrue(self.rider.check_password('OldRiderPass1!'))

    def test_staff_cannot_reset_superuser_password(self):
        root = User.objects.create_superuser(
            username='root', email='root@example.com', password='RootPass1!'
        )
        self.client.force_authenticate(self.admin)
        response = self.client.post(
            f'/api/auth/admin/reset-password/{root.id}/', {'generate': True}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        root.refresh_from_db()
        self.assertTrue(root.check_password('RootPass1!'))

    def test_superuser_can_reset_superuser_password(self):
        root = User.objects.create_superuser(
            username='root2', email='root2@example.com', password='RootPass1!'
        )
        self.client.force_authenticate(root)
        response = self.client.post(
            f'/api/auth/admin/reset-password/{root.id}/', {'new_password': 'FreshRoot1!'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        root.refresh_from_db()
        self.assertTrue(root.check_password('FreshRoot1!'))


class GoogleAuthTests(TestCase):
    """Google sign-in: audience, email verification and account-state checks."""

    URL = '/api/auth/google/'
    OUR_CLIENT = 'ours.apps.googleusercontent.com'

    def setUp(self):
        cache.clear()
        self.client = APIClient()

    def _patch_google(self, userinfo, tokeninfo=None, userinfo_ok=True, tokeninfo_ok=True):
        """Stub the two Google endpoints GoogleAuthView calls."""
        def fake_get(url, **kwargs):
            resp = mock.Mock()
            if 'tokeninfo' in url:
                resp.ok = tokeninfo_ok
                resp.json.return_value = tokeninfo or {'aud': self.OUR_CLIENT}
            else:
                resp.ok = userinfo_ok
                resp.json.return_value = userinfo
            return resp
        return mock.patch('requests.get', side_effect=fake_get)

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[OUR_CLIENT])
    def test_creates_customer_for_new_verified_email(self):
        userinfo = {'email': 'New.User@example.com', 'email_verified': True,
                    'given_name': 'New', 'family_name': 'User'}
        with self._patch_google(userinfo):
            response = self.client.post(self.URL, {'access_token': 'tok'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertIn('access', response.data)
        user = User.objects.get(email='new.user@example.com')
        self.assertEqual(user.profile.user_type, 'customer')
        self.assertFalse(user.has_usable_password())

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[OUR_CLIENT])
    def test_rejects_token_issued_to_another_app(self):
        userinfo = {'email': 'victim@example.com', 'email_verified': True}
        with self._patch_google(userinfo, tokeninfo={'aud': 'someone-else.apps.googleusercontent.com'}):
            response = self.client.post(self.URL, {'access_token': 'stolen'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(User.objects.filter(email='victim@example.com').exists())

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[OUR_CLIENT])
    def test_accepts_azp_when_aud_differs(self):
        userinfo = {'email': 'azp@example.com', 'email_verified': True}
        with self._patch_google(userinfo, tokeninfo={'aud': 'other', 'azp': self.OUR_CLIENT}):
            response = self.client.post(self.URL, {'access_token': 'tok'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[OUR_CLIENT])
    def test_rejects_unverified_email(self):
        """Otherwise an unverified address could hijack an existing account."""
        existing = User.objects.create_user(
            username='realowner', email='owner@example.com', password='RealPass1!'
        )
        userinfo = {'email': 'owner@example.com', 'email_verified': False}
        with self._patch_google(userinfo):
            response = self.client.post(self.URL, {'access_token': 'tok'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)
        self.assertNotIn('access', response.data)
        existing.refresh_from_db()
        self.assertTrue(existing.check_password('RealPass1!'))

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[OUR_CLIENT])
    def test_rejects_disabled_account(self):
        User.objects.create_user(
            username='banned', email='banned@example.com',
            password='Pass1234!', is_active=False,
        )
        userinfo = {'email': 'banned@example.com', 'email_verified': True}
        with self._patch_google(userinfo):
            response = self.client.post(self.URL, {'access_token': 'tok'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_403_FORBIDDEN)

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[OUR_CLIENT])
    def test_signs_in_existing_user_without_duplicating(self):
        User.objects.create_user(
            username='existing', email='existing@example.com', password='Pass1234!'
        )
        userinfo = {'email': 'existing@example.com', 'email_verified': True}
        with self._patch_google(userinfo):
            response = self.client.post(self.URL, {'access_token': 'tok'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)
        self.assertEqual(User.objects.filter(email='existing@example.com').count(), 1)

    @override_settings(GOOGLE_ALLOWED_CLIENT_IDS=[])
    def test_audience_check_skipped_when_unconfigured(self):
        """Local dev convenience — documented as unsafe for deployment."""
        userinfo = {'email': 'dev@example.com', 'email_verified': True}
        with self._patch_google(userinfo, tokeninfo={'aud': 'anything'}):
            response = self.client.post(self.URL, {'access_token': 'tok'}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_200_OK)

    def test_missing_token_rejected(self):
        response = self.client.post(self.URL, {}, format='json')
        self.assertEqual(response.status_code, http_status.HTTP_400_BAD_REQUEST)


class AreaTests(TestCase):
    """Admin-managed delivery localities offered on the signup form."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.admin = User.objects.create_user(
            username='areaadmin', password='Pass1234!', is_staff=True
        )
        self.customer = User.objects.create_user(username='areacust', password='Pass1234!')
        Area.objects.create(name='Johar Town', order=1)
        Area.objects.create(name='Wapda Town', order=2)
        Area.objects.create(name='Old Town', order=3, is_active=False)

    def test_area_list_is_public(self):
        """Signup happens before login, so the dropdown must not need auth."""
        res = self.client.get('/api/auth/areas/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        names = [a['name'] for a in res.data]
        self.assertIn('Johar Town', names)

    def test_public_list_hides_inactive_areas(self):
        res = self.client.get('/api/auth/areas/')
        self.assertNotIn('Old Town', [a['name'] for a in res.data])

    def test_public_list_is_ordered(self):
        res = self.client.get('/api/auth/areas/')
        self.assertEqual([a['name'] for a in res.data], ['Johar Town', 'Wapda Town'])

    def test_admin_sees_inactive_areas(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/auth/admin/areas/')
        self.assertIn('Old Town', [a['name'] for a in res.data])

    def test_admin_can_create_area(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/auth/admin/areas/', {'name': 'Model Town'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertTrue(Area.objects.filter(name='Model Town').exists())

    def test_duplicate_area_rejected_case_insensitively(self):
        """'johar town' and 'Johar Town' are the same place in a dropdown."""
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/auth/admin/areas/', {'name': 'johar town'}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_blank_area_name_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/auth/admin/areas/', {'name': '   '}, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_customer_cannot_manage_areas(self):
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get('/api/auth/admin/areas/').status_code, 403)
        self.assertEqual(
            self.client.post('/api/auth/admin/areas/', {'name': 'X'}, format='json').status_code,
            403,
        )

    def test_signup_accepts_an_area_outside_the_list(self):
        """The list is a suggestion, not a constraint."""
        res = self.client.post('/api/auth/register/', {
            'username': 'customarea', 'email': 'custom@example.com',
            'password': 'Password123!', 'password_confirm': 'Password123!',
            'phone_number': '03001234567', 'house_number': 'H-9',
            'area': 'Somewhere Not Listed',
        })
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        profile = User.objects.get(username='customarea').profile
        self.assertEqual(profile.area, 'Somewhere Not Listed')

    def test_block_is_optional_but_area_is_not(self):
        base = {
            'username': 'noblock', 'email': 'noblock@example.com',
            'password': 'Password123!', 'password_confirm': 'Password123!',
            'phone_number': '03001234567', 'house_number': 'H-9',
        }
        res = self.client.post('/api/auth/register/', {**base, 'area': 'Johar Town'})
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.get(username='noblock').profile.address,
                         'H-9, Johar Town')
