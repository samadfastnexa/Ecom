"""Customer delivery pin: who may set it, whose claim it records, who sees it."""

from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from activities.models import ActivityLog
from orders.models import Order

# Somewhere in Lahore, matching the rider-tracking tests.
LAT = '31.520370'
LNG = '74.358749'

PROFILE_URL = '/api/auth/profile/'
REGISTER_URL = '/api/auth/register/'


def pin_url(user):
    return f'/api/auth/customers/{user.id}/location/'


class CustomerPinTestMixin:
    """A customer with an assigned order, the rider carrying it, and bystanders."""

    def setUp(self):
        # DRF throttle state lives in the cache and leaks between tests.
        cache.clear()
        self.client = APIClient()

        self.customer = User.objects.create_user(username='pincust', password='CustPass1!')
        self.customer.profile.user_type = 'customer'
        self.customer.profile.save()

        self.other_customer = User.objects.create_user(
            username='pinother', password='CustPass1!',
        )
        self.other_customer.profile.user_type = 'customer'
        self.other_customer.profile.save()

        self.rider = User.objects.create_user(username='pinrider', password='RiderPass1!')
        self.rider.profile.user_type = 'delivery_boy'
        self.rider.profile.is_rider = True
        self.rider.profile.save()

        self.admin = User.objects.create_user(
            username='pinadmin', password='AdminPass1!', is_staff=True,
        )

        self.order = Order.objects.create(
            user=self.customer, total_price=Decimal('300.00'),
            shipping_address='H-12, Block 6', status='Processing',
            assigned_delivery_boy=self.rider.profile,
        )


class RegistrationPinTests(TestCase):
    """The signup form may drop an optional map pin."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.payload = {
            'username': 'newpin',
            'email': 'newpin@example.com',
            'password': 'StrongPass1!',
            'password_confirm': 'StrongPass1!',
            'phone_number': '0300-1234567',
            'house_number': 'H-12',
            'area': 'Johar Town',
        }

    def test_registration_with_a_pin_records_the_customers_own_claim(self):
        res = self.client.post(REGISTER_URL, {
            **self.payload, 'customer_latitude': LAT, 'customer_longitude': LNG,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        profile = User.objects.get(username='newpin').profile
        self.assertEqual(profile.customer_latitude, Decimal(LAT))
        self.assertEqual(profile.customer_longitude, Decimal(LNG))
        self.assertEqual(profile.location_source, 'customer')
        self.assertEqual(profile.location_set_by, profile.user)
        self.assertIsNotNone(profile.location_set_at)

    def test_registration_without_a_pin_leaves_it_unset(self):
        res = self.client.post(REGISTER_URL, self.payload, format='json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

        profile = User.objects.get(username='newpin').profile
        self.assertIsNone(profile.customer_latitude)
        self.assertIsNone(profile.location_source)
        self.assertIsNone(profile.location_set_at)

    def test_half_a_pin_is_rejected(self):
        res = self.client.post(REGISTER_URL, {
            **self.payload, 'customer_latitude': LAT,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertFalse(User.objects.filter(username='newpin').exists())

    def test_out_of_range_pin_is_rejected(self):
        res = self.client.post(REGISTER_URL, {
            **self.payload, 'customer_latitude': '91.0', 'customer_longitude': LNG,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class ProfilePinTests(CustomerPinTestMixin, TestCase):
    """Customers set / read / clear their OWN pin via the profile endpoint."""

    def test_customer_sets_their_own_pin(self):
        self.client.force_authenticate(self.customer)
        res = self.client.patch(PROFILE_URL, {
            'customer_latitude': LAT, 'customer_longitude': LNG,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        profile = User.objects.get(pk=self.customer.pk).profile
        self.assertEqual(profile.customer_latitude, Decimal(LAT))
        self.assertEqual(profile.location_source, 'customer')
        self.assertEqual(profile.location_set_by, self.customer)

    def test_own_pin_reads_back_as_json_numbers(self):
        """A Google Maps LatLngLiteral needs numbers, not quoted decimals."""
        self.customer.profile.set_customer_pin(
            Decimal(LAT), Decimal(LNG), source='customer', set_by=self.customer,
        )
        self.customer.profile.save()
        self.client.force_authenticate(self.customer)
        body = self.client.get(PROFILE_URL).json()
        self.assertIsInstance(body['customer_latitude'], float)
        self.assertAlmostEqual(body['customer_latitude'], 31.520370, places=6)

    def test_null_pair_clears_the_pin(self):
        self.customer.profile.set_customer_pin(
            Decimal(LAT), Decimal(LNG), source='customer', set_by=self.customer,
        )
        self.customer.profile.save()
        self.client.force_authenticate(self.customer)
        res = self.client.patch(PROFILE_URL, {
            'customer_latitude': None, 'customer_longitude': None,
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        profile = User.objects.get(pk=self.customer.pk).profile
        self.assertIsNone(profile.customer_latitude)
        self.assertIsNone(profile.location_source)
        self.assertIsNone(profile.location_set_by)

    def test_half_a_pin_is_rejected(self):
        self.client.force_authenticate(self.customer)
        res = self.client.patch(
            PROFILE_URL, {'customer_latitude': LAT}, format='json',
        )
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)

    def test_out_of_range_pin_is_rejected(self):
        self.client.force_authenticate(self.customer)
        res = self.client.patch(PROFILE_URL, {
            'customer_latitude': LAT, 'customer_longitude': '181.0',
        }, format='json')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class RiderPinTests(CustomerPinTestMixin, TestCase):
    """POST /api/auth/customers/<id>/location/ — the field-correction path."""

    def _post(self, target, **extra):
        payload = {'customer_latitude': LAT, 'customer_longitude': LNG}
        payload.update(extra)
        return self.client.post(pin_url(target), payload, format='json')

    def test_assigned_rider_corrects_the_pin(self):
        self.client.force_authenticate(self.rider)
        res = self._post(self.customer)
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertAlmostEqual(res.json()['customer_latitude'], 31.520370, places=6)

        profile = User.objects.get(pk=self.customer.pk).profile
        self.assertEqual(profile.customer_latitude, Decimal(LAT))
        self.assertEqual(profile.location_source, 'rider')
        self.assertEqual(profile.location_set_by, self.rider)
        self.assertIsNotNone(profile.location_set_at)

    def test_pin_correction_is_activity_logged(self):
        self.client.force_authenticate(self.rider)
        self._post(self.customer)
        self.assertTrue(
            ActivityLog.objects.filter(
                action='Customer Location Set', target_id=self.customer.id,
            ).exists()
        )

    def test_rider_without_an_active_order_is_403(self):
        self.client.force_authenticate(self.rider)
        res = self._post(self.other_customer)
        self.assertEqual(res.status_code, status.HTTP_403_FORBIDDEN)
        self.assertIsNone(
            User.objects.get(pk=self.other_customer.pk).profile.customer_latitude
        )

    def test_a_finished_order_no_longer_grants_access(self):
        Order.objects.filter(pk=self.order.pk).update(status='Delivered')
        self.client.force_authenticate(self.rider)
        self.assertEqual(
            self._post(self.customer).status_code, status.HTTP_403_FORBIDDEN,
        )

    def test_staff_may_pin_any_customer(self):
        self.client.force_authenticate(self.admin)
        res = self._post(self.other_customer)
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        profile = User.objects.get(pk=self.other_customer.pk).profile
        self.assertEqual(profile.location_source, 'rider')
        self.assertEqual(profile.location_set_by, self.admin)

    def test_a_customer_cannot_pin_another_customer(self):
        self.client.force_authenticate(self.other_customer)
        self.assertEqual(
            self._post(self.customer).status_code, status.HTTP_403_FORBIDDEN,
        )

    def test_anonymous_cannot_pin(self):
        self.assertEqual(
            self._post(self.customer).status_code, status.HTTP_401_UNAUTHORIZED,
        )

    def test_target_must_be_a_customer(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self._post(self.rider).status_code, status.HTTP_404_NOT_FOUND,
        )

    def test_out_of_range_pin_is_rejected(self):
        self.client.force_authenticate(self.admin)
        res = self._post(self.customer, customer_latitude='-91.0')
        self.assertEqual(res.status_code, status.HTTP_400_BAD_REQUEST)


class AdminPinVisibilityTests(CustomerPinTestMixin, TestCase):
    """Web / mobile admin customer payloads carry the pin."""

    def setUp(self):
        super().setUp()
        self.customer.profile.set_customer_pin(
            Decimal(LAT), Decimal(LNG), source='customer', set_by=self.customer,
        )
        self.customer.profile.save()

    def test_admin_customer_list_includes_the_pin(self):
        self.client.force_authenticate(self.admin)
        rows = self.client.get('/api/auth/admin/customers/').json()
        row = next(r for r in rows if r['id'] == self.customer.id)
        self.assertAlmostEqual(row['customer_latitude'], 31.520370, places=6)
        self.assertAlmostEqual(row['customer_longitude'], 74.358749, places=6)
        self.assertEqual(row['location_source'], 'customer')
        self.assertIsNotNone(row['location_set_at'])

    def test_admin_customer_detail_includes_the_pin(self):
        self.client.force_authenticate(self.admin)
        body = self.client.get(f'/api/auth/admin/customers/{self.customer.id}/').json()
        self.assertAlmostEqual(body['customer_latitude'], 31.520370, places=6)
        self.assertEqual(body['location_source'], 'customer')

    def test_unset_pin_serializes_as_nulls(self):
        self.client.force_authenticate(self.admin)
        rows = self.client.get('/api/auth/admin/customers/').json()
        row = next(r for r in rows if r['id'] == self.other_customer.id)
        self.assertIsNone(row['customer_latitude'])
        self.assertIsNone(row['location_source'])
        self.assertIsNone(row['location_set_at'])
