"""The customer address book: defaults, ownership, and the profile mirror."""

from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status as http
from rest_framework.test import APIClient

from .models import CustomerAddress

ADDRESSES_URL = '/api/auth/addresses/'


class AddressBookTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username='addrbook', password='Str0ng!Pass',
        )
        self.client.force_authenticate(self.customer)

    def _payload(self, **overrides):
        payload = {
            'label': 'home',
            'house_number': 'H-12',
            'portion': 'upper',
            'block': 'Block 6',
            'area': 'Johar Town',
        }
        payload.update(overrides)
        return payload

    def test_first_address_becomes_the_default_automatically(self):
        """Otherwise checkout would open with nothing pre-selected."""
        res = self.client.post(ADDRESSES_URL, self._payload(), format='json')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertTrue(res.data['is_default'])

    def test_address_line_is_composed_with_the_portion_label(self):
        res = self.client.post(ADDRESSES_URL, self._payload(), format='json')
        self.assertEqual(res.data['address'], 'H-12, Upper, Block 6, Johar Town')

    def test_second_address_is_not_default_unless_asked(self):
        self.client.post(ADDRESSES_URL, self._payload(), format='json')
        res = self.client.post(
            ADDRESSES_URL, self._payload(label='office', house_number='H-9'),
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertFalse(res.data['is_default'])

    def test_new_address_can_claim_default_on_creation(self):
        first = self.client.post(ADDRESSES_URL, self._payload(), format='json')
        second = self.client.post(
            ADDRESSES_URL,
            self._payload(label='office', house_number='H-9', is_default=True),
            format='json',
        )
        self.assertTrue(second.data['is_default'])
        self.assertFalse(
            CustomerAddress.objects.get(pk=first.data['id']).is_default
        )

    def test_only_one_default_survives(self):
        for i in range(3):
            self.client.post(
                ADDRESSES_URL,
                self._payload(house_number=f'H-{i}', is_default=True),
                format='json',
            )
        defaults = CustomerAddress.objects.filter(
            user=self.customer, is_default=True,
        )
        self.assertEqual(defaults.count(), 1)

    def test_set_default_endpoint_promotes_and_demotes(self):
        first = self.client.post(ADDRESSES_URL, self._payload(), format='json')
        second = self.client.post(
            ADDRESSES_URL, self._payload(label='shop', house_number='H-9'),
            format='json',
        )
        res = self.client.post(f'{ADDRESSES_URL}{second.data["id"]}/set_default/')
        self.assertEqual(res.status_code, http.HTTP_200_OK, res.data)
        self.assertTrue(res.data['is_default'])
        self.assertFalse(
            CustomerAddress.objects.get(pk=first.data['id']).is_default
        )

    def test_deleting_the_default_promotes_another(self):
        """A customer with addresses must never be left without a default."""
        first = self.client.post(ADDRESSES_URL, self._payload(), format='json')
        self.client.post(
            ADDRESSES_URL, self._payload(label='office', house_number='H-9'),
            format='json',
        )
        self.client.delete(f'{ADDRESSES_URL}{first.data["id"]}/')
        remaining = CustomerAddress.objects.filter(user=self.customer)
        self.assertEqual(remaining.count(), 1)
        self.assertTrue(remaining.first().is_default)

    def test_default_mirrors_onto_the_profile(self):
        """Ledger PDFs, admin lists and the rider card all read the profile."""
        self.client.post(
            ADDRESSES_URL,
            self._payload(latitude='31.500000', longitude='74.300000'),
            format='json',
        )
        profile = User.objects.get(pk=self.customer.pk).profile
        self.assertEqual(profile.address, 'H-12, Upper, Block 6, Johar Town')
        self.assertEqual(profile.house_number, 'H-12')
        self.assertEqual(profile.customer_latitude, Decimal('31.500000'))
        self.assertEqual(profile.customer_longitude, Decimal('74.300000'))

    def test_pin_is_optional(self):
        res = self.client.post(ADDRESSES_URL, self._payload(), format='json')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        self.assertIsNone(res.data['latitude'])
        self.assertFalse(res.data['has_pin'])

    def test_half_a_pin_is_rejected(self):
        """One coordinate without the other would drop a rider in the sea."""
        res = self.client.post(
            ADDRESSES_URL, self._payload(latitude='31.5'), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)

    def test_out_of_range_coordinates_are_rejected(self):
        res = self.client.post(
            ADDRESSES_URL,
            self._payload(latitude='95.0', longitude='74.3'),
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)

    def test_house_and_area_are_required(self):
        for missing in ('house_number', 'area'):
            with self.subTest(missing=missing):
                res = self.client.post(
                    ADDRESSES_URL, self._payload(**{missing: ''}), format='json',
                )
                self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
                self.assertIn(missing, res.data)

    def test_custom_label_is_used_when_label_is_other(self):
        res = self.client.post(
            ADDRESSES_URL,
            self._payload(label='other', custom_label='Farmhouse'),
            format='json',
        )
        self.assertEqual(res.data['display_label'], 'Farmhouse')

    def test_free_text_portion_is_normalised(self):
        res = self.client.post(
            ADDRESSES_URL, self._payload(portion='Ground Floor'), format='json',
        )
        self.assertEqual(res.data['portion'], 'ground')


class AddressOwnershipTests(TestCase):
    """One customer must never reach another's address book."""

    def setUp(self):
        self.client = APIClient()
        self.owner = User.objects.create_user(username='owner', password='Str0ng!Pass')
        self.other = User.objects.create_user(username='other', password='Str0ng!Pass')
        self.address = CustomerAddress.objects.create(
            user=self.owner, house_number='H-1', area='Johar Town',
        )

    def test_list_only_returns_your_own(self):
        self.client.force_authenticate(self.other)
        res = self.client.get(ADDRESSES_URL)
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        self.assertEqual(len(rows), 0)

    def test_cannot_read_another_customers_address(self):
        self.client.force_authenticate(self.other)
        res = self.client.get(f'{ADDRESSES_URL}{self.address.id}/')
        self.assertEqual(res.status_code, http.HTTP_404_NOT_FOUND)

    def test_cannot_delete_another_customers_address(self):
        self.client.force_authenticate(self.other)
        res = self.client.delete(f'{ADDRESSES_URL}{self.address.id}/')
        self.assertEqual(res.status_code, http.HTTP_404_NOT_FOUND)
        self.assertTrue(CustomerAddress.objects.filter(pk=self.address.pk).exists())

    def test_anonymous_is_denied(self):
        res = self.client.get(ADDRESSES_URL)
        self.assertIn(
            res.status_code,
            (http.HTTP_401_UNAUTHORIZED, http.HTTP_403_FORBIDDEN),
        )
