from decimal import Decimal

from django.contrib.auth.models import User
from django.core.cache import cache
from django.core.management import call_command
from django.db.models import Sum
from django.test import TestCase
from django.utils import timezone

from accounts.models import UserProfile
from orders.models import Order
from plant.models import BottleType, CustomerType, DeliveryRecord
from products.models import Product

from . import service
from .models import LedgerEntry, LedgerSettings, NumberSequence


class LedgerTestMixin:
    """Shared setup plus the invariant every ledger test leans on."""

    def setUp(self):
        cache.clear()
        self.customer = User.objects.create_user(
            username='cust1', email='cust1@example.com', password='Pass1234!',
        )
        self.other = User.objects.create_user(username='cust2', password='Pass1234!')
        self.admin = User.objects.create_user(
            username='admin1', password='Pass1234!', is_staff=True,
        )
        settings_obj = LedgerSettings.load()
        settings_obj.auto_charge_enabled = True
        settings_obj.ledger_start_date = None
        settings_obj.save()

    def assertLedgerConsistent(self, user):
        """SUM(journal) must always equal the cached account_balance."""
        journal = (
            LedgerEntry.objects.filter(customer=user)
            .aggregate(total=Sum('amount'))['total'] or Decimal('0')
        )
        cached = UserProfile.objects.get(user=user).account_balance
        self.assertEqual(
            journal, cached,
            f'journal {journal} != cached balance {cached} for {user.username}',
        )

    def balance(self, user):
        return UserProfile.objects.get(user=user).account_balance

    def stock(self, user):
        """Bottles the customer is currently holding."""
        agg = LedgerEntry.objects.filter(customer=user).aggregate(
            out=Sum('bottles_out'), inn=Sum('bottles_in'),
        )
        return (agg['out'] or 0) - (agg['inn'] or 0)


class LedgerServiceTests(LedgerTestMixin, TestCase):

    def test_payment_credits_balance(self):
        entry = service.record_payment(
            customer=self.customer, amount=1000, payment_method='Cash', actor=self.admin,
        )
        self.assertEqual(self.balance(self.customer), Decimal('1000.00'))
        self.assertEqual(entry.balance_after, Decimal('1000.00'))
        self.assertTrue(entry.receipt_number.startswith('RCP-'))
        self.assertLedgerConsistent(self.customer)

    def test_charge_debits_balance(self):
        service.post_entry(
            customer=self.customer, entry_type=LedgerEntry.ORDER_CHARGE, amount=-500,
        )
        self.assertEqual(self.balance(self.customer), Decimal('-500.00'))
        self.assertLedgerConsistent(self.customer)

    def test_invariant_holds_over_mixed_sequence(self):
        service.post_entry(
            customer=self.customer, entry_type=LedgerEntry.ORDER_CHARGE, amount=-1200,
        )
        service.record_payment(customer=self.customer, amount=500)
        service.post_manual(
            customer=self.customer, entry_type=LedgerEntry.ADJUSTMENT,
            amount=-50, description='Late fee',
        )
        service.post_manual(
            customer=self.customer, entry_type=LedgerEntry.REFUND,
            amount=100, description='Goodwill',
        )
        self.assertEqual(self.balance(self.customer), Decimal('-650.00'))
        self.assertLedgerConsistent(self.customer)

    def test_zero_amount_with_no_bottles_is_noop(self):
        result = service.post_entry(
            customer=self.customer, entry_type=LedgerEntry.ADJUSTMENT, amount=0,
        )
        self.assertIsNone(result)
        self.assertEqual(LedgerEntry.objects.count(), 0)

    def test_bottle_only_entry_is_allowed(self):
        """Collecting empties moves no money but must still be recorded."""
        entry = service.post_entry(
            customer=self.customer, entry_type=LedgerEntry.ADJUSTMENT,
            amount=0, bottles_in=3, description='Empties collected',
        )
        self.assertIsNotNone(entry)
        self.assertEqual(self.stock(self.customer), -3)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))

    def test_no_customer_posts_nothing(self):
        self.assertIsNone(service.post_entry(
            customer=None, entry_type=LedgerEntry.PAYMENT, amount=100,
        ))
        self.assertEqual(LedgerEntry.objects.count(), 0)

    def test_payment_must_be_positive(self):
        with self.assertRaises(ValueError):
            service.record_payment(customer=self.customer, amount=0)
        with self.assertRaises(ValueError):
            service.record_payment(customer=self.customer, amount=-5)

    def test_manual_entry_requires_description(self):
        with self.assertRaises(ValueError):
            service.post_manual(
                customer=self.customer, entry_type=LedgerEntry.ADJUSTMENT,
                amount=10, description='   ',
            )

    def test_manual_entry_rejects_derived_types(self):
        with self.assertRaises(ValueError):
            service.post_manual(
                customer=self.customer, entry_type=LedgerEntry.ORDER_CHARGE,
                amount=-10, description='nope',
            )

    def test_receipt_numbers_are_sequential_and_gapless(self):
        numbers = [
            service.record_payment(customer=self.customer, amount=10).receipt_number
            for _ in range(3)
        ]
        year = timezone.localdate().year
        self.assertEqual(numbers, [
            f'RCP-{year}-000001', f'RCP-{year}-000002', f'RCP-{year}-000003',
        ])

    def test_customer_code_is_assigned_once(self):
        first = service.ensure_customer_code(self.customer)
        second = service.ensure_customer_code(self.customer)
        self.assertEqual(first, second)
        self.assertEqual(first, '00001')
        self.assertEqual(service.ensure_customer_code(self.other), '00002')


class LedgerStockTests(LedgerTestMixin, TestCase):
    """The Empty / Prev. Stock / Current Stock columns from the statement."""

    def test_running_stock_matches_worked_example(self):
        # Mirrors the real statement: 13 delivered, 13 empties back, stock flat.
        for delivered in (2, 5, 6):
            service.post_entry(
                customer=self.customer, entry_type=LedgerEntry.PLANT_CHARGE,
                amount=-150 * delivered, quantity=delivered, unit_price=150,
                item_label='19L Refill',
                bottles_out=delivered, bottles_in=delivered,
            )
        self.assertEqual(self.stock(self.customer), 0)
        self.assertEqual(self.balance(self.customer), Decimal('-1950.00'))
        self.assertLedgerConsistent(self.customer)

    def test_unreturned_empties_increase_stock(self):
        service.post_entry(
            customer=self.customer, entry_type=LedgerEntry.PLANT_CHARGE,
            amount=-300, bottles_out=2, bottles_in=0,
        )
        self.assertEqual(self.stock(self.customer), 2)


class LedgerIdempotencyTests(LedgerTestMixin, TestCase):

    def setUp(self):
        super().setUp()
        self.product = Product.objects.create(name='19L Refill', price=Decimal('150.00'))
        self.order = Order.objects.create(
            user=self.customer, total_price=Decimal('300.00'),
            shipping_address='H-12', status='Delivered',
            number_of_bottles=2, cash_amount=Decimal('0'),
        )

    def test_sync_order_is_idempotent(self):
        for _ in range(3):
            service.sync_order(self.order)
        self.assertEqual(LedgerEntry.objects.filter(customer=self.customer).count(), 1)
        self.assertEqual(self.balance(self.customer), Decimal('-300.00'))
        self.assertLedgerConsistent(self.customer)

    def test_sync_order_posts_correction_on_total_change(self):
        service.sync_order(self.order)
        self.order.total_price = Decimal('500.00')
        self.order.save()
        service.sync_order(self.order)
        self.assertEqual(self.balance(self.customer), Decimal('-500.00'))
        self.assertEqual(LedgerEntry.objects.count(), 2)  # append-only correction
        self.assertLedgerConsistent(self.customer)

    def test_bottles_are_delta_synced_not_duplicated(self):
        """Re-syncing must not re-add the bottle counts."""
        service.sync_order(self.order)
        self.assertEqual(self.stock(self.customer), 2)
        service.sync_order(self.order)
        service.sync_order(self.order)
        self.assertEqual(self.stock(self.customer), 2)

    def test_cancelling_delivered_order_reverses_charge(self):
        service.sync_order(self.order)
        self.order.status = 'Cancelled'
        self.order.save()
        service.sync_order(self.order)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))
        self.assertEqual(self.stock(self.customer), 0)
        self.assertLedgerConsistent(self.customer)

    def test_guest_order_posts_nothing(self):
        guest = Order.objects.create(
            user=None, guest_name='Walk-in', total_price=Decimal('100.00'),
            shipping_address='X', status='Delivered',
        )
        service.sync_order(guest)
        self.assertEqual(LedgerEntry.objects.count(), 0)

    def test_undelivered_order_is_not_charged(self):
        pending = Order.objects.create(
            user=self.customer, total_price=Decimal('900.00'),
            shipping_address='H-12', status='Pending',
        )
        service.sync_order(pending)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))

    def test_auto_charge_switch_blocks_posting(self):
        settings_obj = LedgerSettings.load()
        settings_obj.auto_charge_enabled = False
        settings_obj.save()
        service.sync_order(self.order)
        self.assertEqual(LedgerEntry.objects.count(), 0)

    def test_entry_before_ledger_start_date_is_skipped(self):
        """The retro-charge guard — editing an old order must not post a charge."""
        settings_obj = LedgerSettings.load()
        settings_obj.ledger_start_date = timezone.localdate() + timezone.timedelta(days=1)
        settings_obj.save()
        service.sync_order(self.order)
        self.assertEqual(LedgerEntry.objects.count(), 0)


class LedgerPlantSyncTests(LedgerTestMixin, TestCase):

    def setUp(self):
        super().setUp()
        self.bottle_type = BottleType.objects.create(
            name='19L Refill', default_price=Decimal('150.00'),
        )
        self.customer_type = CustomerType.objects.create(
            name='Home', default_price=Decimal('150.00'),
        )
        self.record = DeliveryRecord.objects.create(
            customer=self.customer, house='355-F upper Jubilee',
            bottle_type=self.bottle_type, customer_type=self.customer_type,
            bottles=2, unit_price=Decimal('150.00'), empties_collected=2,
            paid_amount=Decimal('0'),
        )

    def test_plant_record_charges_and_tracks_bottles(self):
        service.sync_delivery_record(self.record)
        self.assertEqual(self.balance(self.customer), Decimal('-300.00'))
        self.assertEqual(self.stock(self.customer), 0)  # 2 out, 2 empties back
        self.assertLedgerConsistent(self.customer)

    def test_plant_payment_credits_balance(self):
        self.record.paid_amount = Decimal('300.00')
        self.record.save()
        service.sync_delivery_record(self.record)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))
        self.assertLedgerConsistent(self.customer)

    def test_plant_record_reattributed_moves_the_money(self):
        service.sync_delivery_record(self.record)
        self.record.customer = self.other
        self.record.save()
        service.sync_delivery_record(self.record)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))
        self.assertEqual(self.stock(self.customer), 0)
        self.assertEqual(self.balance(self.other), Decimal('-300.00'))
        self.assertLedgerConsistent(self.customer)
        self.assertLedgerConsistent(self.other)

    def test_void_delivery_record_unwinds_entries(self):
        service.sync_delivery_record(self.record)
        service.void_delivery_record(self.record)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))
        self.assertGreater(LedgerEntry.objects.count(), 0)  # rows survive
        self.assertLedgerConsistent(self.customer)

    def test_record_without_customer_posts_nothing(self):
        orphan = DeliveryRecord.objects.create(
            house='Unlinked house', bottle_type=self.bottle_type,
            customer_type=self.customer_type, bottles=3, unit_price=Decimal('150.00'),
        )
        service.sync_delivery_record(orphan)
        self.assertEqual(LedgerEntry.objects.count(), 0)


class LedgerVoidTests(LedgerTestMixin, TestCase):

    def test_void_creates_mirror_and_restores_balance(self):
        entry = service.record_payment(customer=self.customer, amount=1000)
        reversal = service.void_entry(entry, reason='Cheque bounced', actor=self.admin)
        self.assertEqual(self.balance(self.customer), Decimal('0.00'))
        self.assertEqual(reversal.reverses_id, entry.pk)
        self.assertEqual(LedgerEntry.objects.count(), 2)
        self.assertLedgerConsistent(self.customer)

    def test_double_void_rejected(self):
        entry = service.record_payment(customer=self.customer, amount=100)
        service.void_entry(entry, reason='first')
        entry.refresh_from_db()
        with self.assertRaises(ValueError):
            service.void_entry(entry, reason='second')

    def test_void_of_source_derived_entry_rejected(self):
        entry = service.post_entry(
            customer=self.customer, entry_type=LedgerEntry.ORDER_CHARGE,
            amount=-100, source_ref='order:1:charge', source_key='order:1:charge#1',
        )
        with self.assertRaises(ValueError):
            service.void_entry(entry, reason='nope')

    def test_void_requires_reason(self):
        entry = service.record_payment(customer=self.customer, amount=100)
        with self.assertRaises(ValueError):
            service.void_entry(entry, reason='  ')

    def test_voided_entry_is_never_deleted(self):
        entry = service.record_payment(customer=self.customer, amount=100)
        service.void_entry(entry, reason='mistake')
        self.assertTrue(LedgerEntry.objects.filter(pk=entry.pk).exists())


class LedgerBalanceSafetyTests(LedgerTestMixin, TestCase):

    def test_stale_user_save_does_not_clobber_balance(self):
        """
        Regression: save_user_profile used to full-save the profile on every
        User.save(), writing back a stale in-memory account_balance.
        """
        stale_user = User.objects.get(pk=self.customer.pk)
        _ = stale_user.profile  # cache a copy showing balance 0

        service.record_payment(customer=self.customer, amount=750)
        self.assertEqual(self.balance(self.customer), Decimal('750.00'))

        stale_user.first_name = 'Renamed'
        stale_user.save()

        self.assertEqual(self.balance(self.customer), Decimal('750.00'))
        self.assertLedgerConsistent(self.customer)

    def test_balance_update_uses_sql_increment(self):
        """Guards against a regression back to read-modify-write."""
        from django.test.utils import CaptureQueriesContext
        from django.db import connection

        with CaptureQueriesContext(connection) as ctx:
            service.record_payment(customer=self.customer, amount=100)

        updates = [
            q['sql'] for q in ctx.captured_queries
            if 'UPDATE' in q['sql'].upper() and 'account_balance' in q['sql']
        ]
        self.assertTrue(updates, 'no account_balance UPDATE was issued')
        self.assertTrue(
            any('account_balance` = (`accounts_userprofile`.`account_balance`' in q
                or 'account_balance" = ("accounts_userprofile"."account_balance"' in q
                for q in updates),
            f'expected an in-place increment, got: {updates}',
        )


class LedgerRecomputeTests(LedgerTestMixin, TestCase):

    def test_check_passes_when_consistent(self):
        service.record_payment(customer=self.customer, amount=100)
        call_command('ledger_recompute', '--check')  # must not raise

    def test_check_detects_and_fix_repairs_drift(self):
        from django.core.management.base import CommandError

        service.record_payment(customer=self.customer, amount=100)
        UserProfile.objects.filter(user=self.customer).update(account_balance=Decimal('999'))

        with self.assertRaises(CommandError):
            call_command('ledger_recompute', '--check')

        call_command('ledger_recompute', '--fix')
        self.assertEqual(self.balance(self.customer), Decimal('100.00'))
        self.assertLedgerConsistent(self.customer)


class NumberSequenceTests(LedgerTestMixin, TestCase):

    def test_sequences_are_independent(self):
        self.assertEqual(service.next_number(NumberSequence.RECEIPT, 2026), 1)
        self.assertEqual(service.next_number(NumberSequence.SALE, 2026), 1)
        self.assertEqual(service.next_number(NumberSequence.RECEIPT, 2026), 2)

    def test_receipt_sequence_resets_per_year(self):
        self.assertEqual(service.next_number(NumberSequence.RECEIPT, 2025), 1)
        self.assertEqual(service.next_number(NumberSequence.RECEIPT, 2026), 1)
