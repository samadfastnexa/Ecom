"""Rider batch: staff rider notes, the rider's customer card, and visit outcomes."""

from datetime import timedelta
from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.db import connection
from django.test import TestCase
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework import status as http
from rest_framework.test import APIClient

from activities.models import ActivityLog
from ledger import service as ledger_service
from plant.models import DeliveryRecord
from products.models import Product
from .models import CustomerVisit, Order, OrderItem

RIDER_ORDERS_URL = '/api/orders/delivery/orders/'
VISIT_URL = '/api/orders/delivery/visits/'
ADMIN_VISITS_URL = '/api/orders/admin/visits/'


class RiderBatchTestMixin:
    """An admin, a rider, and a customer holding an order assigned to that rider."""

    def setUp(self):
        cache.clear()
        self.client = APIClient()

        self.admin = User.objects.create_user(
            username='batchadmin', password='AdminPass1!', is_staff=True,
        )
        self.rider = User.objects.create_user(
            username='batchrider', password='RiderPass1!',
            first_name='Asif', last_name='Khan',
        )
        self.rider.profile.user_type = 'delivery_boy'
        self.rider.profile.is_rider = True
        self.rider.profile.save()

        self.other_rider = User.objects.create_user(
            username='batchrider2', password='RiderPass2!',
        )
        self.other_rider.profile.user_type = 'delivery_boy'
        self.other_rider.profile.is_rider = True
        self.other_rider.profile.save()

        self.customer = User.objects.create_user(
            username='batchcust', password='CustPass1!',
            first_name='Bilal', last_name='Ahmed',
        )
        profile = self.customer.profile
        profile.user_type = 'customer'
        profile.phone_number = '03001234567'
        profile.house_number = 'H-12'
        profile.block = 'Block 6'
        profile.area = 'Johar Town'
        profile.sync_address()
        profile.save()

        self.product = Product.objects.create(name='19L Bottle', price=Decimal('180.00'))
        self.order = Order.objects.create(
            user=self.customer, total_price=Decimal('360.00'),
            shipping_address='H-12, Block 6, Johar Town', status='Processing',
            assigned_delivery_boy=self.rider.profile,
            rider_note='Gate code 4412, collect old dues',
        )
        OrderItem.objects.create(
            order=self.order, product=self.product, quantity=2, price=Decimal('180.00'),
        )

    def rider_detail_url(self, order=None):
        return f'{RIDER_ORDERS_URL}{(order or self.order).id}/'


class RiderNoteTests(RiderBatchTestMixin, TestCase):
    """Order.rider_note: staff write it, the assigned rider reads it, the
    customer must never learn the key exists."""

    def test_staff_set_the_note_at_order_creation(self):
        self.client.force_authenticate(self.admin)
        res = self.client.post('/api/orders/admin/', {
            'user_id': self.customer.pk,
            'shipping_address': 'H-12',
            'items': [{'product_id': self.product.pk, 'quantity': 1}],
            'rider_note': 'Ring twice; dog in the yard',
        }, format='json')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED)
        self.assertEqual(res.data['rider_note'], 'Ring twice; dog in the yard')
        self.assertEqual(
            Order.objects.get(pk=res.data['id']).rider_note,
            'Ring twice; dog in the yard',
        )

    def test_staff_edit_the_note(self):
        self.client.force_authenticate(self.admin)
        res = self.client.patch(
            f'/api/orders/admin/{self.order.id}/',
            {'rider_note': 'Updated instruction'}, format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_200_OK)
        self.assertEqual(res.data['rider_note'], 'Updated instruction')
        self.order.refresh_from_db()
        self.assertEqual(self.order.rider_note, 'Updated instruction')

    def test_customer_payloads_do_not_contain_the_key(self):
        """Absent, not blank — the customer must not even see the field."""
        self.client.force_authenticate(self.customer)
        listing = self.client.get('/api/orders/')
        self.assertEqual(listing.status_code, http.HTTP_200_OK)
        for row in listing.data:
            self.assertNotIn('rider_note', row.keys())

        detail = self.client.get(f'/api/orders/{self.order.id}/')
        self.assertEqual(detail.status_code, http.HTTP_200_OK)
        self.assertNotIn('rider_note', detail.data.keys())

    def test_assigned_rider_sees_the_note(self):
        self.client.force_authenticate(self.rider)
        listing = self.client.get(RIDER_ORDERS_URL)
        self.assertEqual(listing.status_code, http.HTTP_200_OK)
        self.assertEqual(
            listing.data[0]['rider_note'], 'Gate code 4412, collect old dues',
        )
        detail = self.client.get(self.rider_detail_url())
        self.assertEqual(
            detail.data['rider_note'], 'Gate code 4412, collect old dues',
        )

    def test_rider_cannot_write_the_note(self):
        self.client.force_authenticate(self.rider)
        res = self.client.patch(
            self.rider_detail_url(),
            {'rider_note': 'rider trying to edit', 'delivery_notes': 'ok'},
            format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_200_OK)
        self.order.refresh_from_db()
        self.assertEqual(self.order.rider_note, 'Gate code 4412, collect old dues')
        self.assertEqual(self.order.delivery_notes, 'ok')

    def test_admin_list_shows_the_note(self):
        self.client.force_authenticate(self.admin)
        rows = self.client.get('/api/orders/admin/').data
        row = next(r for r in rows if r['id'] == self.order.id)
        self.assertEqual(row['rider_note'], 'Gate code 4412, collect old dues')


class RiderCustomerCardTests(RiderBatchTestMixin, TestCase):
    """The nested customer card on the rider's order payload."""

    def setUp(self):
        super().setUp()
        # Balance and bottle stock come from the ledger — its service is the
        # only writer of account_balance. Customer owes 350 and holds 3 bottles.
        ledger_service.post_manual(
            customer=self.customer, entry_type='opening',
            amount=Decimal('-350'), description='Opening balance',
            bottles_out=5, bottles_in=2, actor=self.admin,
        )
        self.customer.profile.refresh_from_db()
        self.customer.profile.set_customer_pin(
            Decimal('31.520370'), Decimal('74.358749'),
            source='customer', set_by=self.customer,
        )
        self.customer.profile.save()

        # Delivery history: a shop order 4 days ago, a plant delivery 2 days
        # ago — the card counts from the most recent of the two.
        old_delivered = Order.objects.create(
            user=self.customer, total_price=Decimal('180.00'),
            shipping_address='H-12', status='Delivered',
        )
        Order.objects.filter(pk=old_delivered.pk).update(
            created_at=timezone.now() - timedelta(days=4),
        )
        DeliveryRecord.objects.create(
            customer=self.customer, bottles=2, unit_price=Decimal('100.00'),
            date=timezone.localdate() - timedelta(days=2),
        )

    def _card(self):
        self.client.force_authenticate(self.rider)
        res = self.client.get(RIDER_ORDERS_URL)
        self.assertEqual(res.status_code, http.HTTP_200_OK)
        row = next(r for r in res.json() if r['id'] == self.order.id)
        return row['customer']

    def test_card_identity_fields(self):
        card = self._card()
        self.assertEqual(card['id'], self.customer.id)
        self.assertEqual(card['name'], 'Bilal Ahmed')
        self.assertEqual(card['phone_number'], '03001234567')
        self.assertEqual(card['address'], 'H-12, Block 6, Johar Town')
        self.assertEqual(card['area'], 'Johar Town')
        self.assertIn('customer_code', card)

    def test_balance_is_owed_positive_money_string(self):
        """Same convention as the admin receivables list: positive = owes."""
        self.assertEqual(self._card()['account_balance'], '350.00')

    def test_bottles_held_is_the_ledger_running_stock(self):
        self.assertEqual(self._card()['bottles_held'], 3)

    def test_last_delivery_days_uses_the_most_recent_source(self):
        self.assertEqual(self._card()['last_delivery_days'], 2)

    def test_last_delivery_days_null_when_never_delivered(self):
        Order.objects.filter(user=self.customer, status='Delivered').delete()
        DeliveryRecord.objects.filter(customer=self.customer).delete()
        self.assertIsNone(self._card()['last_delivery_days'])

    def test_pin_is_json_numbers(self):
        card = self._card()
        self.assertIsInstance(card['customer_latitude'], float)
        self.assertAlmostEqual(card['customer_latitude'], 31.520370, places=6)
        self.assertAlmostEqual(card['customer_longitude'], 74.358749, places=6)

    def test_detail_payload_carries_the_same_card(self):
        self.client.force_authenticate(self.rider)
        card = self.client.get(self.rider_detail_url()).json()['customer']
        self.assertEqual(card['account_balance'], '350.00')
        self.assertEqual(card['bottles_held'], 3)

    def test_guest_order_gets_a_minimal_card(self):
        guest_order = Order.objects.create(
            user=None, guest_name='Walk In', guest_phone='03110000000',
            total_price=Decimal('180.00'), shipping_address='Shop 4, Market',
            status='Processing', assigned_delivery_boy=self.rider.profile,
        )
        self.client.force_authenticate(self.rider)
        row = next(
            r for r in self.client.get(RIDER_ORDERS_URL).json()
            if r['id'] == guest_order.id
        )
        card = row['customer']
        self.assertIsNone(card['id'])
        self.assertEqual(card['name'], 'Walk In')
        self.assertEqual(card['phone_number'], '03110000000')
        self.assertEqual(card['address'], 'Shop 4, Market')
        self.assertIsNone(card['account_balance'])
        self.assertIsNone(card['last_delivery_days'])

    def test_list_query_count_does_not_grow_with_orders(self):
        """The card lookups are batched — dozens of orders must not mean
        dozens of queries."""
        self.client.force_authenticate(self.rider)
        with CaptureQueriesContext(connection) as small:
            self.client.get(RIDER_ORDERS_URL)

        for i in range(3):
            extra_customer = User.objects.create_user(
                username=f'cardcust{i}', password='CustPass1!',
            )
            extra_customer.profile.user_type = 'customer'
            extra_customer.profile.save()
            order = Order.objects.create(
                user=extra_customer, total_price=Decimal('180.00'),
                shipping_address=f'H-{i}', status='Processing',
                assigned_delivery_boy=self.rider.profile,
            )
            OrderItem.objects.create(
                order=order, product=self.product, quantity=1, price=Decimal('180.00'),
            )

        with CaptureQueriesContext(connection) as large:
            self.client.get(RIDER_ORDERS_URL)
        self.assertEqual(len(small), len(large))


class VisitOutcomeTests(RiderBatchTestMixin, TestCase):
    """POST /api/orders/delivery/visits/ and the journal around it."""

    def _record(self, **extra):
        payload = {'order': self.order.id, 'outcome': 'no_response'}
        payload.update(extra)
        return self.client.post(VISIT_URL, payload, format='json')

    def test_assigned_rider_records_an_outcome(self):
        self.client.force_authenticate(self.rider)
        res = self._record(outcome='no_need', note='Said tomorrow')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED)
        self.assertEqual(res.data['outcome'], 'no_need')
        self.assertEqual(res.data['note'], 'Said tomorrow')
        self.assertEqual(res.data['rider'], self.rider.id)
        self.assertEqual(res.data['customer'], self.customer.id)

        visit = CustomerVisit.objects.get()
        self.assertEqual(visit.rider, self.rider)
        self.assertEqual(visit.customer, self.customer)
        self.assertEqual(visit.order, self.order)

    def test_recording_does_not_change_order_status(self):
        """A visit is a journal entry; the business may re-attempt the order."""
        self.client.force_authenticate(self.rider)
        self._record()
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'Processing')
        self.assertEqual(self.order.delivery_status, 'Pending')

    def test_visit_is_activity_logged(self):
        self.client.force_authenticate(self.rider)
        self._record()
        row = ActivityLog.objects.get(action='Visit Recorded')
        self.assertEqual(row.actor_id, self.rider.id)
        self.assertEqual(row.details['outcome'], 'no_response')

    def test_unassigned_rider_is_403(self):
        self.client.force_authenticate(self.other_rider)
        res = self._record()
        self.assertEqual(res.status_code, http.HTTP_403_FORBIDDEN)
        self.assertEqual(CustomerVisit.objects.count(), 0)

    def test_finished_orders_reject_new_visits(self):
        self.client.force_authenticate(self.rider)
        for final_status in ('Delivered', 'Cancelled'):
            with self.subTest(status=final_status):
                Order.objects.filter(pk=self.order.pk).update(status=final_status)
                res = self._record()
                self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)
        self.assertEqual(CustomerVisit.objects.count(), 0)

    def test_guest_order_rejects_visits(self):
        guest_order = Order.objects.create(
            user=None, guest_name='Walk In', total_price=Decimal('180.00'),
            shipping_address='Shop 4', status='Processing',
            assigned_delivery_boy=self.rider.profile,
        )
        self.client.force_authenticate(self.rider)
        res = self._record(order=guest_order.id)
        self.assertEqual(res.status_code, http.HTTP_400_BAD_REQUEST)

    def test_unknown_order_and_bad_outcome_are_400(self):
        self.client.force_authenticate(self.rider)
        self.assertEqual(
            self._record(order=999999).status_code, http.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self._record(outcome='came_back_later').status_code,
            http.HTTP_400_BAD_REQUEST,
        )

    def test_only_riders_may_record_visits(self):
        for user in (self.customer, self.admin):
            with self.subTest(user=user.username):
                self.client.force_authenticate(user)
                self.assertEqual(
                    self._record().status_code, http.HTTP_403_FORBIDDEN,
                )
        self.client.force_authenticate(None)
        self.assertEqual(self._record().status_code, http.HTTP_401_UNAUTHORIZED)

    def test_rider_order_payload_shows_todays_visits_only(self):
        self.client.force_authenticate(self.rider)
        self._record(outcome='no_response')
        stale = CustomerVisit.objects.create(
            rider=self.rider, customer=self.customer, order=self.order,
            outcome='no_need',
        )
        CustomerVisit.objects.filter(pk=stale.pk).update(
            created_at=timezone.now() - timedelta(days=1),
        )

        row = next(
            r for r in self.client.get(RIDER_ORDERS_URL).json()
            if r['id'] == self.order.id
        )
        self.assertEqual(len(row['today_visits']), 1)
        visit = row['today_visits'][0]
        self.assertEqual(visit['outcome'], 'no_response')
        self.assertIn('created_at', visit)

        detail = self.client.get(self.rider_detail_url()).json()
        self.assertEqual(len(detail['today_visits']), 1)


class AdminVisitListTests(RiderBatchTestMixin, TestCase):
    """GET /api/orders/admin/visits/"""

    def setUp(self):
        super().setUp()
        self.visit = CustomerVisit.objects.create(
            rider=self.rider, customer=self.customer, order=self.order,
            outcome='no_response', note='No answer at gate',
        )
        other_cust = User.objects.create_user(username='visitcust2', password='CustPass1!')
        other_cust.profile.user_type = 'customer'
        other_cust.profile.save()
        self.other_visit = CustomerVisit.objects.create(
            rider=self.other_rider, customer=other_cust, order=None,
            outcome='no_need',
        )

    def test_staff_list_shape_and_content(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(ADMIN_VISITS_URL)
        self.assertEqual(res.status_code, http.HTTP_200_OK)
        self.assertEqual(res.data['count'], 2)
        self.assertIn('limit', res.data)
        self.assertIn('offset', res.data)

        row = next(r for r in res.data['results'] if r['id'] == self.visit.id)
        self.assertEqual(row['outcome'], 'no_response')
        self.assertEqual(row['note'], 'No answer at gate')
        self.assertEqual(row['rider_name'], 'Asif Khan')
        self.assertEqual(row['customer'], self.customer.id)
        self.assertEqual(row['order'], self.order.id)

    def test_filter_by_customer_and_rider(self):
        self.client.force_authenticate(self.admin)
        by_customer = self.client.get(ADMIN_VISITS_URL, {'customer': self.customer.id})
        self.assertEqual(by_customer.data['count'], 1)
        self.assertEqual(by_customer.data['results'][0]['id'], self.visit.id)

        by_rider = self.client.get(ADMIN_VISITS_URL, {'rider': self.other_rider.id})
        self.assertEqual(by_rider.data['count'], 1)
        self.assertEqual(by_rider.data['results'][0]['id'], self.other_visit.id)

    def test_date_range_filter(self):
        CustomerVisit.objects.filter(pk=self.other_visit.pk).update(
            created_at=timezone.now() - timedelta(days=10),
        )
        self.client.force_authenticate(self.admin)
        today = timezone.localdate().isoformat()
        res = self.client.get(ADMIN_VISITS_URL, {'date_from': today})
        self.assertEqual(res.data['count'], 1)
        self.assertEqual(res.data['results'][0]['id'], self.visit.id)

    def test_bad_filters_are_400(self):
        self.client.force_authenticate(self.admin)
        self.assertEqual(
            self.client.get(ADMIN_VISITS_URL, {'customer': 'bilal'}).status_code,
            http.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.get(ADMIN_VISITS_URL, {'date_from': 'yesterday'}).status_code,
            http.HTTP_400_BAD_REQUEST,
        )

    def test_pagination(self):
        self.client.force_authenticate(self.admin)
        res = self.client.get(ADMIN_VISITS_URL, {'limit': 1, 'offset': 1})
        self.assertEqual(res.data['count'], 2)
        self.assertEqual(len(res.data['results']), 1)
        self.assertEqual(res.data['limit'], 1)
        self.assertEqual(res.data['offset'], 1)

    def test_rider_cannot_read_the_admin_journal(self):
        self.client.force_authenticate(self.rider)
        self.assertEqual(
            self.client.get(ADMIN_VISITS_URL).status_code, http.HTTP_403_FORBIDDEN,
        )
