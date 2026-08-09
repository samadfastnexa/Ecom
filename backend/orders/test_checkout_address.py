"""Checkout copies the chosen address onto the order, pin included."""

from decimal import Decimal

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status as http
from rest_framework.test import APIClient

from accounts.models import CustomerAddress
from products.models import Product
from .models import Order

ORDERS_URL = '/api/orders/'


class CheckoutAddressTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username='checkout', password='Str0ng!Pass',
        )
        self.client.force_authenticate(self.customer)
        self.product = Product.objects.create(
            name='19L Bottle', price=Decimal('150.00'),
        )
        self.address = CustomerAddress.objects.create(
            user=self.customer, label='office',
            house_number='H-12', portion='upper', block='Block 6',
            area='Johar Town',
            latitude=Decimal('31.500000'), longitude=Decimal('74.300000'),
        )

    def _payload(self, **overrides):
        # Deliberately no shipping_address: this is what the checkout screen
        # actually sends once an address is chosen.
        payload = {
            'items': [{
                'product_id': self.product.id,
                'quantity': 2,
                'price': '150.00',
            }],
            'total_price': '300.00',
            'payment_method': 'COD',
        }
        payload.update(overrides)
        return payload

    def test_address_id_alone_is_enough(self):
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=self.address.id), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)

    def test_neither_address_id_nor_text_is_rejected(self):
        res = self.client.post(ORDERS_URL, self._payload(), format='json')
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
        self.assertIn('shipping_address', res.data)

    def test_order_snapshots_the_chosen_address(self):
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=self.address.id), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        order = Order.objects.get(pk=res.data['id'])
        self.assertEqual(order.shipping_address, 'H-12, Upper, Block 6, Johar Town')
        self.assertEqual(order.house_number, 'H-12')
        self.assertEqual(order.area, 'Johar Town')
        self.assertEqual(order.shipping_latitude, Decimal('31.500000'))
        self.assertEqual(order.shipping_longitude, Decimal('74.300000'))
        self.assertEqual(order.shipping_label, 'Office')

    def test_snapshot_survives_editing_the_address_afterwards(self):
        """A past order must not move because the address book changed."""
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=self.address.id), format='json',
        )
        self.address.house_number = 'H-999'
        self.address.area = 'Somewhere Else'
        self.address.latitude = Decimal('24.860000')
        self.address.longitude = Decimal('67.010000')
        self.address.save()

        order = Order.objects.get(pk=res.data['id'])
        self.assertEqual(order.house_number, 'H-12')
        self.assertEqual(order.shipping_latitude, Decimal('31.500000'))

    def test_snapshot_survives_deleting_the_address(self):
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=self.address.id), format='json',
        )
        self.address.delete()
        order = Order.objects.get(pk=res.data['id'])
        self.assertEqual(order.shipping_address, 'H-12, Upper, Block 6, Johar Town')

    def test_another_customers_address_is_rejected(self):
        stranger = User.objects.create_user(username='stranger', password='Str0ng!Pass')
        theirs = CustomerAddress.objects.create(
            user=stranger, house_number='H-1', area='Model Town',
        )
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=theirs.id), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
        self.assertIn('address_id', res.data)

    def test_unknown_address_is_rejected(self):
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=999999), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)

    def test_checkout_without_an_address_id_still_works(self):
        """Older app builds post a plain shipping_address and must keep working."""
        res = self.client.post(
            ORDERS_URL,
            self._payload(shipping_address='H-9, Model Town'),
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        order = Order.objects.get(pk=res.data['id'])
        self.assertEqual(order.shipping_address, 'H-9, Model Town')
        self.assertIsNone(order.shipping_latitude)

    def test_address_without_a_pin_leaves_coordinates_empty(self):
        pinless = CustomerAddress.objects.create(
            user=self.customer, label='shop',
            house_number='H-7', area='Gulberg',
        )
        res = self.client.post(
            ORDERS_URL, self._payload(address_id=pinless.id), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED, res.data)
        order = Order.objects.get(pk=res.data['id'])
        self.assertIsNone(order.shipping_latitude)
        self.assertEqual(order.shipping_label, 'Shop')


class OrderAddressVisibilityTests(TestCase):
    """Admin and rider must both be able to see where an order is going."""

    def setUp(self):
        self.client = APIClient()
        self.customer = User.objects.create_user(
            username='viscust', password='Str0ng!Pass',
        )
        self.admin = User.objects.create_user(
            username='visadmin', password='Str0ng!Pass', is_staff=True,
        )
        self.rider = User.objects.create_user(
            username='visrider', password='Str0ng!Pass',
        )
        self.rider.profile.user_type = 'delivery_boy'
        self.rider.profile.save()

        self.order = Order.objects.create(
            user=self.customer, total_price=Decimal('300.00'),
            status='Processing',
            shipping_address='H-12, Upper, Block 6, Johar Town',
            house_number='H-12', portion='upper', block='Block 6',
            area='Johar Town',
            shipping_latitude=Decimal('31.500000'),
            shipping_longitude=Decimal('74.300000'),
            shipping_label='Office',
            assigned_delivery_boy=self.rider.profile,
        )

    def test_admin_order_list_exposes_the_pin(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get('/api/orders/admin/')
        rows = res.data['results'] if isinstance(res.data, dict) else res.data
        row = next(r for r in rows if r['id'] == self.order.id)
        self.assertEqual(row['shipping_latitude'], '31.500000')
        self.assertEqual(row['shipping_longitude'], '74.300000')
        self.assertEqual(row['shipping_label'], 'Office')

    def test_rider_order_list_exposes_the_pin(self):
        self.client.force_authenticate(self.rider)
        res = self.client.get('/api/orders/delivery/orders/')
        rows = res.data if isinstance(res.data, list) else res.data['results']
        row = next(r for r in rows if r['id'] == self.order.id)
        self.assertEqual(row['shipping_latitude'], '31.500000')
        self.assertEqual(row['shipping_address'], 'H-12, Upper, Block 6, Johar Town')

    def test_customer_sees_their_own_order_address(self):
        self.client.force_authenticate(self.customer)
        res = self.client.get(f'{ORDERS_URL}{self.order.id}/')
        self.assertEqual(res.status_code, http.HTTP_200_OK)
        self.assertEqual(res.data['shipping_label'], 'Office')
