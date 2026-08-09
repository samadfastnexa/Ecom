"""
The ONLY module permitted to write UserProfile.account_balance.

Everything here maintains one invariant:

    SUM(LedgerEntry.amount WHERE customer=U) == U.profile.account_balance

`manage.py ledger_recompute --check` asserts it; the tests assert it after almost
every case. If you add a code path that touches account_balance outside this
module, that invariant is what you break.
"""

from decimal import Decimal

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import F, Sum
from django.utils import timezone

from accounts.models import UserProfile

from .models import LedgerEntry, LedgerSettings, NumberSequence

ZERO = Decimal('0')


def _dec(value):
    """Coerce to Decimal; None/'' become 0."""
    if value in (None, ''):
        return ZERO
    return value if isinstance(value, Decimal) else Decimal(str(value))


# ─── Core append ──────────────────────────────────────────────────────────────

@transaction.atomic
def post_entry(*, customer, entry_type, amount, entry_date=None, description='',
               order=None, delivery_record=None, payment_method='', reference='',
               source_ref='', source_key=None, receipt_number=None,
               reverses=None, void_reason='', actor=None, notes='',
               item_label='', quantity=None, unit_price=None, document_number='',
               gross_amount=None, discount_amount=None,
               bottles_out=0, bottles_in=0, update_balance=True):
    """
    Append one journal row and move the cached balance by the same amount.

    Returns None (posting nothing) when there is no customer or the amount is
    zero — callers rely on this so they can stay branch-free.

    `update_balance=False` is only for the backfill, where account_balance
    already contains the figure being recorded and must not be doubled.
    """
    if customer is None:
        return None

    amount = _dec(amount)
    # A row with no money AND no bottle movement carries no information.
    # Bottle-only rows (e.g. a pure empties collection) are legitimate.
    if amount == ZERO and not bottles_out and not bottles_in:
        return None

    # Lock the profile row first. This serializes concurrent writers for this
    # customer, which is what makes the balance_after snapshot trustworthy.
    profile = UserProfile.objects.select_for_update().get(user_id=customer.pk)
    balance_before = _dec(profile.account_balance)

    entry = LedgerEntry.objects.create(
        customer=customer,
        entry_type=entry_type,
        amount=amount,
        entry_date=entry_date or timezone.localdate(),
        description=description,
        order=order,
        delivery_record=delivery_record,
        payment_method=payment_method,
        reference=reference,
        source_ref=source_ref,
        source_key=source_key,
        receipt_number=receipt_number,
        reverses=reverses,
        void_reason=void_reason,
        created_by=actor,
        notes=notes,
        item_label=item_label,
        quantity=quantity,
        unit_price=unit_price,
        document_number=document_number,
        gross_amount=gross_amount,
        discount_amount=discount_amount,
        bottles_out=bottles_out or 0,
        bottles_in=bottles_in or 0,
        balance_after=balance_before + amount if update_balance else balance_before,
    )

    if update_balance:
        # Queryset .update() with F() emits an in-place SQL increment: no
        # read-modify-write, and it bypasses Model.save() so the post_save
        # signal on User can never clobber it.
        UserProfile.objects.filter(pk=profile.pk).update(
            account_balance=F('account_balance') + amount
        )

    return entry


# ─── Idempotent source synchronisation ───────────────────────────────────────

def _posted_by_customer(source_ref):
    """Per-customer totals of every tracked quantity for one source."""
    rows = (
        LedgerEntry.objects
        .filter(source_ref=source_ref)
        .values('customer_id')
        .annotate(
            amount=Sum('amount'),
            bottles_out=Sum('bottles_out'),
            bottles_in=Sum('bottles_in'),
        )
    )
    return {
        r['customer_id']: (
            _dec(r['amount']),
            int(r['bottles_out'] or 0),
            int(r['bottles_in'] or 0),
        )
        for r in rows
    }


@transaction.atomic
def sync_source(*, source_ref, customer, target_amount, entry_type,
                target_bottles_out=0, target_bottles_in=0,
                description='', actor=None, **entry_fields):
    """
    Make the entries tagged `source_ref` total `target_amount` (and the given
    bottle counts) for `customer`, and zero for anyone it used to be attributed
    to.

    Append-only: differences are posted as new delta rows, never by editing
    existing ones — so money and bottles are BOTH synced as deltas. Running this
    repeatedly is a no-op, which is what makes it safe to call on every save of
    the underlying order or delivery record.
    """
    target = (_dec(target_amount), int(target_bottles_out or 0), int(target_bottles_in or 0))
    posted = _posted_by_customer(source_ref)
    seq = LedgerEntry.objects.filter(source_ref=source_ref).count()
    result = None

    def _post_delta(cust, deltas, desc):
        nonlocal seq
        seq += 1
        return post_entry(
            customer=cust,
            entry_type=entry_type,
            amount=deltas[0],
            bottles_out=deltas[1],
            bottles_in=deltas[2],
            description=desc,
            source_ref=source_ref,
            source_key=f'{source_ref}#{seq}',
            actor=actor,
            **entry_fields,
        )

    # 1. Unwind any customer this source is no longer attributed to — covers
    #    re-attribution, and deletion when customer is None.
    for customer_id, totals in posted.items():
        if customer is not None and customer_id == customer.pk:
            continue
        if totals == (ZERO, 0, 0):
            continue
        _post_delta(
            User.objects.get(pk=customer_id),
            tuple(-t for t in totals),
            description or 'Reversal — record reassigned or removed',
        )

    if customer is None:
        return None

    # 2. Move the current customer to the target.
    current = posted.get(customer.pk, (ZERO, 0, 0))
    deltas = tuple(t - c for t, c in zip(target, current))
    if deltas != (ZERO, 0, 0):
        result = _post_delta(customer, deltas, description)
    return result


# ─── Guards ──────────────────────────────────────────────────────────────────

def _auto_charges_allowed(on_date=None):
    """Automatic (source-derived) postings are gated; manual ones never are."""
    settings_obj = LedgerSettings.load()
    if not settings_obj.auto_charge_enabled:
        return False
    if on_date and settings_obj.ledger_start_date and on_date < settings_obj.ledger_start_date:
        # Editing a pre-go-live record must not post a historical charge.
        return False
    return True


# ─── Source hooks ────────────────────────────────────────────────────────────

def sync_order(order, actor=None, force=False):
    """
    Bring the ledger in line with one order.

    Charge lands only once the order reaches Delivered — an order can sit
    Pending forever or be cancelled, and charging earlier would put phantom debt
    on the balance. Cancelling after delivery then reverses itself for free,
    because the target simply drops back to zero.
    """
    if order is None or order.user_id is None:  # guests have no ledger
        return
    order_date = order.created_at.date() if order.created_at else None
    if not force and not _auto_charges_allowed(order_date):
        return

    delivered = order.status == 'Delivered'
    charge = -_dec(order.total_price) if delivered else ZERO
    bottles = order.number_of_bottles or 0
    # Display-only breakdown; the charge itself stays the frozen NET.
    discount = _dec(order.discount_amount) if delivered else ZERO

    sync_source(
        source_ref=f'order:{order.pk}:charge',
        customer=order.user,
        target_amount=charge,
        entry_type=LedgerEntry.ORDER_CHARGE,
        description=f'Order #{order.pk}',
        item_label=_order_item_label(order),
        quantity=bottles or None,
        document_number=str(order.pk),
        gross_amount=_dec(order.gross_amount) if discount > ZERO else None,
        discount_amount=discount if discount > ZERO else None,
        # Bottles only leave once the order is actually delivered.
        target_bottles_out=bottles if delivered else 0,
        order=order,
        actor=actor,
    )
    sync_source(
        source_ref=f'order:{order.pk}:cash',
        customer=order.user,
        target_amount=_dec(order.cash_amount),
        entry_type=LedgerEntry.ORDER_PAYMENT,
        description=f'Payment against order #{order.pk}',
        item_label='Amount Received',
        document_number=str(order.pk),
        order=order,
        payment_method=order.payment_method or '',
        actor=actor,
    )


def _order_item_label(order):
    """Single item name, or 'N items' when the order is mixed."""
    names = [i.product.name for i in order.items.all()[:2]]
    count = order.items.count()
    if count == 1:
        return names[0][:120]
    if count > 1:
        return f'{count} items'
    return ''


def sync_delivery_record(record, actor=None, force=False):
    """Bring the ledger in line with one plant bottle-delivery record."""
    if record is None or record.customer_id is None:
        return
    if not force and not _auto_charges_allowed(record.date):
        return

    label = record.house or f'Delivery #{record.pk}'
    bottle_type = getattr(record.bottle_type, 'name', '') or 'Bottles'
    discount = _dec(record.discount_amount)

    sync_source(
        source_ref=f'plant:{record.pk}:charge',
        customer=record.customer,
        target_amount=-_dec(record.amount),
        entry_type=LedgerEntry.PLANT_CHARGE,
        description=f'{record.bottles} bottle(s) — {label}',
        item_label=bottle_type[:120],
        quantity=record.bottles or None,
        unit_price=_dec(record.unit_price) or None,
        document_number=str(record.pk),
        gross_amount=_dec(record.gross_amount) if discount > ZERO else None,
        discount_amount=discount if discount > ZERO else None,
        target_bottles_out=record.bottles or 0,
        target_bottles_in=record.empties_collected or 0,
        delivery_record=record,
        entry_date=record.date,
        actor=actor,
    )
    sync_source(
        source_ref=f'plant:{record.pk}:paid',
        customer=record.customer,
        target_amount=_dec(record.paid_amount),
        entry_type=LedgerEntry.PLANT_PAYMENT,
        description=f'Payment for delivery — {label}',
        item_label='Amount Received',
        document_number=str(record.pk),
        delivery_record=record,
        entry_date=record.date,
        payment_method='Cash',
        actor=actor,
    )


def void_delivery_record(record, actor=None):
    """Unwind a plant record's entries before the row is deleted."""
    if record is None or record.pk is None:
        return
    for suffix, entry_type in (('charge', LedgerEntry.PLANT_CHARGE),
                               ('paid', LedgerEntry.PLANT_PAYMENT)):
        sync_source(
            source_ref=f'plant:{record.pk}:{suffix}',
            customer=None,  # None target unwinds every attributed customer
            target_amount=ZERO,
            entry_type=entry_type,
            description='Delivery record deleted',
            actor=actor,
        )


# ─── Receipt numbering ───────────────────────────────────────────────────────

@transaction.atomic
def next_number(key, year=0):
    """Allocate the next value of a named counter under a row lock."""
    NumberSequence.objects.get_or_create(key=key, year=year)
    seq = NumberSequence.objects.select_for_update().get(key=key, year=year)
    seq.last_number += 1
    seq.save(update_fields=['last_number'])
    return seq.last_number


def next_receipt_number(on_date=None):
    """Gapless RCP-YYYY-NNNNNN, resets each year."""
    year = (on_date or timezone.localdate()).year
    return f'RCP-{year}-{next_number(NumberSequence.RECEIPT, year):06d}'


def next_sale_number(on_date=None):
    """Bill number for a charge line — the statement's 'Sale - 29816'."""
    year = (on_date or timezone.localdate()).year
    return str(next_number(NumberSequence.SALE, year))


def ensure_customer_code(user):
    """
    Assign a short account code (00245-style) the first time one is needed.
    Idempotent: returns the existing code if there already is one.
    """
    profile = UserProfile.objects.get(user=user)
    if profile.customer_code:
        return profile.customer_code
    code = f'{next_number(NumberSequence.CUSTOMER_CODE):05d}'
    # .update() rather than .save() so the post_save signal chain stays out of it.
    UserProfile.objects.filter(pk=profile.pk).update(customer_code=code)
    return code


# ─── Admin-initiated entries ─────────────────────────────────────────────────

@transaction.atomic
def record_payment(*, customer, amount, payment_method='Cash', entry_date=None,
                   reference='', notes='', actor=None):
    """Record a standalone payment against a customer's balance."""
    amount = _dec(amount)
    if amount <= ZERO:
        raise ValueError('Payment amount must be greater than zero.')

    entry_date = entry_date or timezone.localdate()
    return post_entry(
        customer=customer,
        entry_type=LedgerEntry.PAYMENT,
        amount=amount,
        entry_date=entry_date,
        description='Payment received',
        payment_method=payment_method,
        reference=reference,
        receipt_number=next_receipt_number(entry_date),
        notes=notes,
        actor=actor,
    )


@transaction.atomic
def post_manual(*, customer, entry_type, amount, description,
                entry_date=None, actor=None, notes='',
                bottles_out=0, bottles_in=0):
    """
    Post an opening balance, adjustment or refund by hand.

    `bottles_out` lets an opening entry carry the customer's existing bottle
    stock, so the statement's 'Prev. Stock' is right from the first period.
    """
    if entry_type not in LedgerEntry.MANUAL_TYPES:
        raise ValueError(f'{entry_type} cannot be posted manually.')
    amount = _dec(amount)
    if amount == ZERO and not bottles_out and not bottles_in:
        raise ValueError('Provide an amount or a bottle count.')
    if not (description or '').strip():
        raise ValueError('A description is required for manual entries.')

    return post_entry(
        customer=customer,
        entry_type=entry_type,
        amount=amount,
        entry_date=entry_date,
        description=description.strip(),
        bottles_out=bottles_out,
        bottles_in=bottles_in,
        notes=notes,
        actor=actor,
    )


@transaction.atomic
def void_entry(entry, *, reason, actor=None):
    """
    Cancel an entry by posting its mirror image. The original is never deleted,
    so both rows stay visible on the statement.
    """
    if entry.is_reversal:
        raise ValueError('This entry is itself a reversal.')
    if entry.is_reversed:
        raise ValueError('This entry has already been voided.')
    if entry.source_ref:
        raise ValueError(
            'This entry is derived from an order or delivery record. '
            'Correct the source record instead and the ledger will follow.'
        )
    if not (reason or '').strip():
        raise ValueError('A reason is required to void an entry.')

    return post_entry(
        customer=entry.customer,
        entry_type=entry.entry_type,
        amount=-_dec(entry.amount),
        entry_date=timezone.localdate(),  # land in the current period, visibly
        description=f'Void: {entry.description or entry.get_entry_type_display()}',
        reverses=entry,
        void_reason=reason.strip(),
        actor=actor,
    )


# ─── Reconciliation ──────────────────────────────────────────────────────────

def computed_balance(user):
    total = (
        LedgerEntry.objects.filter(customer=user)
        .aggregate(total=Sum('amount'))['total']
    )
    return _dec(total)


def balance_drift(user):
    """Cached balance minus journal total. Non-zero means something is wrong."""
    profile = UserProfile.objects.get(user=user)
    return _dec(profile.account_balance) - computed_balance(user)
