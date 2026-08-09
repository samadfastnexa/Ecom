"""Discount categories on the daily bottle round (plant DeliveryRecords)."""

from decimal import Decimal

from django.contrib.auth.models import Permission, User
from django.test import TestCase
from rest_framework import status as http
from rest_framework.test import APIClient

from accounts.models import DiscountCategory
from activities.models import ActivityLog
from ledger.tests import LedgerTestMixin

from .models import DeliveryRecord


class PlantDiscountTests(LedgerTestMixin, TestCase):
    """Auto-application, frozen snapshots, overrides and the ledger invariant."""

    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

        self.wholesale = DiscountCategory.objects.create(
            name='Wholesale', discount_type='fixed', discount_value=Decimal('30'),
        )
        self.customer.profile.user_type = 'customer'
        self.customer.profile.discount_category = self.wholesale
        self.customer.profile.save()

    def _grant_override(self, user):
        user.user_permissions.add(
            Permission.objects.get(codename='can_override_discount')
        )
        return User.objects.get(pk=user.pk)  # drop the cached permission set

    def _payload(self, **extra):
        data = {
            'customer_id': self.customer.pk,
            'house': '355-F upper Jubilee',
            'bottles': 2,
            'unit_price': '180.00',
            'empties_collected': 2,
            'paid_amount': '0',
        }
        data.update(extra)
        return data

    # ── Auto application ─────────────────────────────────────────────────────

    def test_record_applies_customers_category(self):
        res = self.client.post('/api/plant/records/', self._payload(), format='json')
        self.assertEqual(res.status_code, http.HTTP_201_CREATED)
        self.assertEqual(Decimal(res.data['gross_amount']), Decimal('360.00'))
        self.assertEqual(Decimal(res.data['discount_amount']), Decimal('60.00'))
        self.assertEqual(res.data['discount_category_name'], 'Wholesale')
        # `amount` stays the NET, so every existing consumer keeps working.
        self.assertEqual(Decimal(res.data['amount']), Decimal('300.00'))

    def test_record_without_category_is_unchanged(self):
        res = self.client.post(
            '/api/plant/records/', self._payload(customer_id=self.other.pk), format='json',
        )
        self.assertEqual(Decimal(res.data['amount']), Decimal('360.00'))
        self.assertEqual(Decimal(res.data['discount_amount']), Decimal('0.00'))
        self.assertEqual(res.data['discount_category_name'], '')

    def test_percentage_category_rounds_half_up(self):
        pct = DiscountCategory.objects.create(
            name='Odd Percent', discount_type='percentage', discount_value=Decimal('2.5'),
        )
        self.customer.profile.discount_category = pct
        self.customer.profile.save(update_fields=['discount_category'])
        res = self.client.post(
            '/api/plant/records/',
            self._payload(bottles=1, unit_price='125.00'), format='json',
        )
        # 2.5% of 125 = 3.125 → 3.13 (HALF_UP, not banker's 3.12).
        self.assertEqual(Decimal(res.data['discount_amount']), Decimal('3.13'))
        self.assertEqual(Decimal(res.data['amount']), Decimal('121.87'))

    def test_discount_capped_at_the_line_gross(self):
        big = DiscountCategory.objects.create(
            name='Huge', discount_type='fixed', discount_value=Decimal('500'),
        )
        self.customer.profile.discount_category = big
        self.customer.profile.save(update_fields=['discount_category'])
        res = self.client.post(
            '/api/plant/records/', self._payload(bottles=1), format='json',
        )
        self.assertEqual(Decimal(res.data['discount_amount']), Decimal('180.00'))
        self.assertEqual(Decimal(res.data['amount']), Decimal('0.00'))

    # ── Frozen snapshot ──────────────────────────────────────────────────────

    def test_category_edit_never_changes_an_existing_record(self):
        res = self.client.post('/api/plant/records/', self._payload(), format='json')
        record_id = res.data['id']

        self.wholesale.discount_value = Decimal('99')
        self.wholesale.save()

        record = DeliveryRecord.objects.get(pk=record_id)
        record.save()  # even a re-save recomputes from the FROZEN values
        self.assertEqual(record.discount_amount, Decimal('60.00'))
        self.assertEqual(record.amount, Decimal('300.00'))
        self.assertEqual(record.discount_value, Decimal('30.00'))

        # Future billing picks up the edit.
        fresh = self.client.post('/api/plant/records/', self._payload(), format='json')
        self.assertEqual(Decimal(fresh.data['discount_amount']), Decimal('198.00'))

    def test_bottle_edit_recomputes_from_the_frozen_values(self):
        res = self.client.post('/api/plant/records/', self._payload(), format='json')
        record_id = res.data['id']
        self.wholesale.discount_value = Decimal('99')
        self.wholesale.save()

        patch = self.client.patch(
            f'/api/plant/records/{record_id}/', {'bottles': 3}, format='json',
        )
        # 3 × frozen Rs 30 — never 3 × the category's new 99.
        self.assertEqual(Decimal(patch.data['discount_amount']), Decimal('90.00'))
        self.assertEqual(Decimal(patch.data['amount']), Decimal('450.00'))
        # And the ledger followed the corrected net.
        self.assertEqual(self.balance(self.customer), Decimal('-450.00'))
        self.assertLedgerConsistent(self.customer)

    # ── Ledger wiring ────────────────────────────────────────────────────────

    def test_invariant_survives_discounted_charge_and_payment(self):
        res = self.client.post('/api/plant/records/', self._payload(), format='json')
        self.assertEqual(self.balance(self.customer), Decimal('-300.00'))
        self.assertLedgerConsistent(self.customer)

        self.client.patch(
            f'/api/plant/records/{res.data["id"]}/', {'paid_amount': '300.00'}, format='json',
        )
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))
        self.assertLedgerConsistent(self.customer)

    def test_charge_entry_carries_display_columns(self):
        from ledger.models import LedgerEntry
        self.client.post('/api/plant/records/', self._payload(), format='json')
        entry = LedgerEntry.objects.get(entry_type=LedgerEntry.PLANT_CHARGE)
        self.assertEqual(entry.amount, Decimal('-300.00'))  # NET, as always
        self.assertEqual(entry.gross_amount, Decimal('360.00'))
        self.assertEqual(entry.discount_amount, Decimal('60.00'))
        self.assertEqual(entry.discount_category_name, 'Wholesale')

    def test_undiscounted_charge_leaves_display_columns_null(self):
        from ledger.models import LedgerEntry
        self.client.post(
            '/api/plant/records/', self._payload(customer_id=self.other.pk), format='json',
        )
        entry = LedgerEntry.objects.get(entry_type=LedgerEntry.PLANT_CHARGE)
        self.assertIsNone(entry.gross_amount)
        self.assertIsNone(entry.discount_amount)

    # ── Override permission ──────────────────────────────────────────────────

    def test_override_without_permission_is_rejected_and_unlogged(self):
        before = DeliveryRecord.objects.count()
        res = self.client.post(
            '/api/plant/records/', self._payload(discount_override='10.00'), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_403_FORBIDDEN)
        self.assertEqual(DeliveryRecord.objects.count(), before)
        self.assertFalse(
            ActivityLog.objects.filter(action='Discount Overridden').exists()
        )

    def test_override_with_permission_applies_and_is_audited(self):
        admin = self._grant_override(self.admin)
        self.client.force_authenticate(admin)
        res = self.client.post(
            '/api/plant/records/', self._payload(discount_override='45.00'), format='json',
        )
        self.assertEqual(res.status_code, http.HTTP_201_CREATED)
        self.assertEqual(Decimal(res.data['discount_amount']), Decimal('45.00'))
        self.assertEqual(Decimal(res.data['amount']), Decimal('315.00'))
        self.assertTrue(res.data['discount_overridden'])
        # The category still labels the receipt line.
        self.assertEqual(res.data['discount_category_name'], 'Wholesale')

        row = ActivityLog.objects.get(action='Discount Overridden')
        self.assertEqual(row.actor_id, admin.pk)
        self.assertEqual(row.details['auto_discount'], '60.00')
        self.assertEqual(row.details['override_discount'], '45.00')
        # And the ledger charged the overridden net.
        self.assertEqual(self.balance(self.customer), Decimal('-315.00'))
        self.assertLedgerConsistent(self.customer)

    def test_override_on_update_with_permission(self):
        res = self.client.post('/api/plant/records/', self._payload(), format='json')
        record_id = res.data['id']

        admin = self._grant_override(self.admin)
        self.client.force_authenticate(admin)
        patch = self.client.patch(
            f'/api/plant/records/{record_id}/', {'discount_override': '0.00'}, format='json',
        )
        self.assertEqual(patch.status_code, http.HTTP_200_OK)
        self.assertEqual(Decimal(patch.data['discount_amount']), Decimal('0.00'))
        self.assertEqual(Decimal(patch.data['amount']), Decimal('360.00'))
        self.assertEqual(self.balance(self.customer), Decimal('-360.00'))
        self.assertLedgerConsistent(self.customer)
        self.assertTrue(
            ActivityLog.objects.filter(action='Discount Overridden').exists()
        )

    def test_update_override_without_permission_is_rejected(self):
        res = self.client.post('/api/plant/records/', self._payload(), format='json')
        patch = self.client.patch(
            f'/api/plant/records/{res.data["id"]}/',
            {'discount_override': '0.00'}, format='json',
        )
        self.assertEqual(patch.status_code, http.HTTP_403_FORBIDDEN)
        record = DeliveryRecord.objects.get(pk=res.data['id'])
        self.assertEqual(record.discount_amount, Decimal('60.00'))
