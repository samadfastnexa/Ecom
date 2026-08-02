from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.test import TestCase
from rest_framework import status as http
from rest_framework.test import APIClient

from products.models import Product
from .models import Order, OrderItem


class RiderDeliveryUpdateTests(TestCase):
    """The rider marking an order Delivered must also move the main order status."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.rider = User.objects.create_user(username='rider1', password='RiderPass1!')
        self.rider.profile.user_type = 'delivery_boy'
        self.rider.profile.is_rider = True
        self.rider.profile.save()

        self.customer = User.objects.create_user(username='cust1', password='CustPass1!')

        self.product = Product.objects.create(
            name='19L Bottle', price=Decimal('250.00'),
        )
        self.order = Order.objects.create(
            user=self.customer,
            total_price=Decimal('500.00'),
            shipping_address='H-12, Block 6',
            status='Processing',
            assigned_delivery_boy=self.rider.profile,
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, quantity=2, price=Decimal('250.00'),
        )
        self.url = f'/api/orders/delivery/orders/{self.order.id}/'
        self.client.force_authenticate(self.rider)

    def _deliver(self, **extra):
        payload = {
            'status': self.order.status,      # what the mobile app sends today
            'delivery_status': 'Delivered',
            'number_of_bottles': 2,
            'delivery_notes': 'Handed to customer',
            'cash_received': True,
            'cash_amount': 500,
            'is_paid': False,
        }
        payload.update(extra)
        return self.client.patch(self.url, payload, format='json')

    def test_delivered_sets_main_order_status(self):
        response = self._deliver()
        self.assertEqual(response.status_code, http.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.delivery_status, 'Delivered')
        self.assertEqual(self.order.status, 'Delivered')

    def test_delivered_response_reports_new_status(self):
        """The app reads the response body, so it must show the new status too."""
        response = self._deliver()
        self.assertEqual(response.data['status'], 'Delivered')
        self.assertEqual(response.data['delivery_status'], 'Delivered')

    def test_delivered_stamps_completion_time_and_locks(self):
        self._deliver()
        self.order.refresh_from_db()
        self.assertIsNotNone(self.order.delivery_completed_at)
        self.assertIsNotNone(self.order.delivery_status_updated_at)

    def test_online_payment_marks_order_paid(self):
        self._deliver(cash_received=False, is_paid=True, cash_amount=500)
        self.order.refresh_from_db()
        self.assertTrue(self.order.is_paid)

    def test_locked_after_delivery(self):
        self._deliver()
        second = self._deliver(delivery_notes='trying again')
        self.assertEqual(second.status_code, http.HTTP_400_BAD_REQUEST)

    def test_notes_still_editable_after_lock(self):
        self._deliver()
        response = self.client.patch(
            self.url, {'delivery_notes': 'Left with guard'}, format='json',
        )
        self.assertEqual(response.status_code, http.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.delivery_notes, 'Left with guard')
        self.assertEqual(self.order.status, 'Delivered')

    def test_non_delivered_status_leaves_order_status_alone(self):
        response = self.client.patch(
            self.url,
            {'status': 'Processing', 'delivery_status': 'Not Responding', 'number_of_bottles': 2},
            format='json',
        )
        self.assertEqual(response.status_code, http.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.delivery_status, 'Not Responding')
        self.assertEqual(self.order.status, 'Processing')

    def test_rider_cannot_force_arbitrary_status(self):
        """`status` is server-derived — a rider must not be able to cancel an order."""
        self.client.patch(
            self.url,
            {'status': 'Cancelled', 'delivery_status': 'Not Responding'},
            format='json',
        )
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'Processing')

    def test_delivered_order_leaves_riders_active_list(self):
        self._deliver()
        listing = self.client.get('/api/orders/delivery/orders/')
        self.assertEqual(listing.status_code, http.HTTP_200_OK)
        ids = [o['id'] for o in listing.data]
        self.assertNotIn(self.order.id, ids)
