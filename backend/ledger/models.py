"""
Append-only customer money journal.

`LedgerEntry` is the source of truth for what a customer owes. `UserProfile.
account_balance` is a denormalized cache of `SUM(amount)` — see ledger/service.py,
which is the only module allowed to write it.

Sign convention matches the existing `account_balance` help text:
    positive = credit to the customer (payment received)
    negative = debit  (charge for goods delivered)
"""

from django.contrib.auth.models import User
from django.db import models
from django.db.models import Q
from django.utils import timezone


class LedgerEntry(models.Model):
    # ── Entry types ──────────────────────────────────────────────────────────
    OPENING = 'opening'
    ORDER_CHARGE = 'order_charge'
    ORDER_PAYMENT = 'order_payment'
    PLANT_CHARGE = 'plant_charge'
    PLANT_PAYMENT = 'plant_payment'
    PAYMENT = 'payment'
    ADJUSTMENT = 'adjustment'
    REFUND = 'refund'

    ENTRY_TYPES = [
        (OPENING, 'Opening Balance'),
        (ORDER_CHARGE, 'Order Charge'),
        (ORDER_PAYMENT, 'Order Payment'),
        (PLANT_CHARGE, 'Bottle Delivery Charge'),
        (PLANT_PAYMENT, 'Bottle Delivery Payment'),
        (PAYMENT, 'Payment Received'),
        (ADJUSTMENT, 'Adjustment'),
        (REFUND, 'Refund'),
    ]

    #: Types that represent money coming in, i.e. that can produce a receipt.
    PAYMENT_TYPES = (PAYMENT, ORDER_PAYMENT, PLANT_PAYMENT)

    #: Types an admin may post by hand via the manual-entry endpoint.
    MANUAL_TYPES = (OPENING, ADJUSTMENT, REFUND)

    # The business collects cash only.
    PAYMENT_METHODS = [
        ('Cash', 'Cash'),
    ]

    # A journal must never lose rows, so the customer cannot be deleted out from
    # under one. The app only ever deactivates users, so this costs nothing.
    customer = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name='ledger_entries',
    )
    entry_date = models.DateField(
        default=timezone.localdate, db_index=True,
        help_text="Value date — the day the money moved, which may predate created_at.",
    )
    entry_type = models.CharField(max_length=24, choices=ENTRY_TYPES, db_index=True)
    amount = models.DecimalField(
        max_digits=14, decimal_places=2,
        help_text="Signed: positive = credit to customer, negative = charge.",
    )
    description = models.CharField(max_length=255, blank=True)

    # ── Statement line detail ────────────────────────────────────────────────
    # Denormalized on purpose: a statement must show what was true on the day,
    # not what the product costs now.
    item_label = models.CharField(
        max_length=120, blank=True, help_text="e.g. '19L Refill' or 'Amount Received'.",
    )
    quantity = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text="Units delivered on this line.",
    )
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    document_number = models.CharField(
        max_length=32, blank=True, db_index=True,
        help_text="Bill / voucher number shown on the statement.",
    )

    # ── Returnable bottle stock ──────────────────────────────────────────────
    # Running stock = cumulative(bottles_out - bottles_in) = bottles the
    # customer is currently holding. Tracked separately from money.
    # Signed, not Positive: a correction row posts the negative delta needed to
    # bring a source back in line, exactly as the money columns do.
    bottles_out = models.IntegerField(
        default=0, help_text="Filled bottles handed to the customer.",
    )
    bottles_in = models.IntegerField(
        default=0, help_text="Empties collected back from the customer.",
    )

    # ── Source links (at most one is set) ────────────────────────────────────
    order = models.ForeignKey(
        'orders.Order', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='ledger_entries',
    )
    delivery_record = models.ForeignKey(
        'plant.DeliveryRecord', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='ledger_entries',
    )

    # ── Idempotency ──────────────────────────────────────────────────────────
    # source_ref groups every entry derived from one source, e.g. 'order:12:charge'.
    # Corrections append new rows sharing the ref rather than editing old ones.
    source_ref = models.CharField(max_length=64, blank=True, db_index=True, editable=False)
    # source_key is the per-row dedupe key, e.g. 'order:12:charge#2'. NULL for
    # manual entries — both MySQL and Postgres treat NULLs as distinct in a
    # UNIQUE index, so unlimited manual entries coexist.
    source_key = models.CharField(
        max_length=64, unique=True, null=True, blank=True, editable=False,
    )

    # ── Payment metadata ─────────────────────────────────────────────────────
    payment_method = models.CharField(max_length=20, blank=True, choices=PAYMENT_METHODS)
    reference = models.CharField(
        max_length=64, blank=True, help_text="Cheque number / transaction id.",
    )
    receipt_number = models.CharField(max_length=24, unique=True, null=True, blank=True)

    # Frozen at insert time — this is what the receipt prints. Distinct from the
    # statement's running_balance, which is recomputed and differs for back-dated
    # entries.
    balance_after = models.DecimalField(
        max_digits=14, decimal_places=2, null=True, blank=True, editable=False,
    )

    # ── Reversal (entries are never hard-deleted) ────────────────────────────
    reverses = models.OneToOneField(
        'self', null=True, blank=True, on_delete=models.PROTECT,
        related_name='reversal',
        help_text="Set on the mirror entry that cancels another out.",
    )
    void_reason = models.CharField(max_length=255, blank=True)

    created_by = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='ledger_entries_created',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-entry_date', '-id']
        verbose_name = 'Ledger entry'
        verbose_name_plural = 'Ledger entries'
        indexes = [
            models.Index(fields=['customer', 'entry_date']),
            models.Index(fields=['customer', 'entry_type']),
            models.Index(fields=['source_ref']),
        ]
        constraints = [
            # MariaDB may ignore CHECK constraints entirely, so service.py
            # validates these in Python too.
            # A row must carry money or bottle movement; a pure empties
            # collection legitimately has amount=0.
            models.CheckConstraint(
                condition=~Q(amount=0) | ~Q(bottles_out=0) | ~Q(bottles_in=0),
                name='ledger_entry_not_empty',
            ),
            models.CheckConstraint(
                condition=Q(order__isnull=True) | Q(delivery_record__isnull=True),
                name='ledger_single_source',
            ),
        ]

    def __str__(self):
        return f'{self.entry_date} {self.get_entry_type_display()} {self.amount:+}'

    # ── Derived presentation helpers ─────────────────────────────────────────

    @property
    def debit(self):
        """Charge amount as a positive number, or None for credits."""
        return -self.amount if self.amount < 0 else None

    @property
    def credit(self):
        """Payment amount as a positive number, or None for charges."""
        return self.amount if self.amount > 0 else None

    @property
    def bottle_delta(self):
        """Net change to the customer's held-bottle stock."""
        return self.bottles_out - self.bottles_in

    @property
    def document_label(self):
        """The statement's 'Bill' column, e.g. 'Sale - 29816'."""
        kind = {
            self.ORDER_CHARGE: 'Sale',
            self.PLANT_CHARGE: 'Sale',
            self.PAYMENT: 'Recovery',
            self.ORDER_PAYMENT: 'Recovery',
            self.PLANT_PAYMENT: 'Recovery',
            self.OPENING: 'Opening',
            self.ADJUSTMENT: 'Adjustment',
            self.REFUND: 'Refund',
        }.get(self.entry_type, 'Entry')
        number = self.document_number or self.receipt_number
        return f'{kind} - {number}' if number else kind

    @property
    def source(self):
        if self.order_id:
            return 'shop'
        if self.delivery_record_id:
            return 'plant'
        return 'manual'

    @property
    def is_reversal(self):
        return self.reverses_id is not None

    @property
    def is_reversed(self):
        return hasattr(self, 'reversal')

    @property
    def can_void(self):
        """Only hand-posted entries may be voided directly."""
        return not self.source_ref and not self.is_reversal and not self.is_reversed


class NumberSequence(models.Model):
    """
    Hands out gapless numbers under a row lock.

    Keyed so one table serves several counters: 'receipt' and 'sale' reset per
    year, 'customer_code' uses year 0 to run continuously.
    """

    RECEIPT = 'receipt'
    SALE = 'sale'
    CUSTOMER_CODE = 'customer_code'

    key = models.CharField(max_length=32)
    year = models.PositiveIntegerField(default=0, help_text="0 = never resets.")
    last_number = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = 'Number sequence'
        verbose_name_plural = 'Number sequences'
        constraints = [
            models.UniqueConstraint(fields=['key', 'year'], name='ledger_sequence_key_year'),
        ]

    def __str__(self):
        return f'{self.key}/{self.year}: {self.last_number}'


class LedgerSettings(models.Model):
    """Singleton — business identity for receipts plus the ledger kill switches."""

    business_name = models.CharField(max_length=150, default='Century Sip')
    business_address = models.TextField(blank=True)
    business_phone = models.CharField(max_length=40, blank=True)
    logo = models.ImageField(upload_to='ledger/', blank=True, null=True)
    receipt_footer = models.CharField(
        max_length=255, blank=True,
        default='Thank you for your business.',
    )

    ledger_start_date = models.DateField(
        null=True, blank=True,
        help_text="Orders and deliveries dated before this are never auto-charged. "
                  "Set by ledger_backfill; prevents editing an old record from "
                  "silently posting a large historical charge.",
    )
    auto_charge_enabled = models.BooleanField(
        default=False,
        help_text="Master switch for automatic charges from orders and bottle "
                  "deliveries. Turn off to stop the ledger moving on its own.",
    )

    class Meta:
        verbose_name = 'Ledger settings'
        verbose_name_plural = 'Ledger settings'

    def save(self, *args, **kwargs):
        self.pk = 1  # singleton, same pattern as plant.PlantSettings
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def __str__(self):
        return 'Ledger settings'
