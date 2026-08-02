"""
Builds a customer statement: opening balance, dated rows with a running total,
period totals, and the returnable-bottle stock either side of the period.

Kept separate from views.py so the PDF renderer and the JSON API produce
identical figures from one implementation.
"""

from decimal import Decimal

from django.db.models import Sum

from accounts.models import UserProfile

from .models import LedgerEntry

ZERO = Decimal('0')

#: Rows are ordered by value date, then insertion order, so a back-dated entry
#: lands in the right place in the running balance.
ROW_ORDER = ('entry_date', 'id')


def _totals(qs):
    agg = qs.aggregate(
        amount=Sum('amount'),
        quantity=Sum('quantity'),
        bottles_out=Sum('bottles_out'),
        bottles_in=Sum('bottles_in'),
    )
    return {
        'amount': agg['amount'] or ZERO,
        'quantity': agg['quantity'] or ZERO,
        'bottles_out': int(agg['bottles_out'] or 0),
        'bottles_in': int(agg['bottles_in'] or 0),
    }


def build_statement(customer, *, start=None, end=None, entry_type=None, source=None):
    """
    Return every figure the statement needs.

    All balances are 'owed positive' — the negation of the stored sign — because
    that is how the printed ledger reads.
    """
    entries = LedgerEntry.objects.filter(customer=customer).select_related(
        'created_by', 'order', 'delivery_record',
    )

    # Everything before the window collapses into the opening balance/stock.
    prior = entries.filter(entry_date__lt=start) if start else entries.none()
    prior_totals = _totals(prior)
    opening_balance = -prior_totals['amount']
    opening_stock = prior_totals['bottles_out'] - prior_totals['bottles_in']

    period = entries
    if start:
        period = period.filter(entry_date__gte=start)
    if end:
        period = period.filter(entry_date__lte=end)
    if entry_type:
        period = period.filter(entry_type=entry_type)
    if source == 'shop':
        period = period.filter(order__isnull=False)
    elif source == 'plant':
        period = period.filter(delivery_record__isnull=False)
    elif source == 'manual':
        period = period.filter(order__isnull=True, delivery_record__isnull=True)

    rows = list(period.order_by(*ROW_ORDER))

    # Walk the rows to produce the running balance and stock columns.
    balance = opening_balance
    stock = opening_stock
    debit_total = credit_total = ZERO
    for row in rows:
        balance -= row.amount           # amount is credit-positive; balance is owed-positive
        stock += row.bottles_out - row.bottles_in
        row.running_balance = balance
        row.stock_after = stock
        if row.amount < ZERO:
            debit_total += -row.amount
        else:
            credit_total += row.amount

    period_totals = _totals(period)

    return {
        'customer': customer,
        'period': {'start': start, 'end': end},
        'opening_balance': opening_balance,
        'closing_balance': balance,
        'opening_stock': opening_stock,
        'closing_stock': stock,
        'totals': {
            'debit': debit_total,
            'credit': credit_total,
            'quantity': period_totals['quantity'],
            'bottles_out': period_totals['bottles_out'],
            'bottles_in': period_totals['bottles_in'],
        },
        'rows': rows,
        'count': len(rows),
    }


def customer_summary(customer):
    """Headline figures for the customer card, without loading every row."""
    entries = LedgerEntry.objects.filter(customer=customer)
    totals = _totals(entries)
    charges = entries.filter(amount__lt=ZERO).aggregate(t=Sum('amount'))['t'] or ZERO
    payments = entries.filter(amount__gt=ZERO).aggregate(t=Sum('amount'))['t'] or ZERO

    last_payment = (
        entries.filter(entry_type__in=LedgerEntry.PAYMENT_TYPES)
        .order_by('-entry_date', '-id')
        .first()
    )
    last_entry = entries.order_by('-entry_date', '-id').first()

    profile = UserProfile.objects.filter(user=customer).first()

    return {
        'customer_id': customer.pk,
        'customer_name': customer.get_full_name() or customer.username,
        'customer_code': getattr(profile, 'customer_code', None),
        'phone': getattr(profile, 'phone_number', None),
        'address': getattr(profile, 'address', None),
        'balance': -totals['amount'],
        'bottles_held': totals['bottles_out'] - totals['bottles_in'],
        'total_charged': -charges,
        'total_paid': payments,
        'entry_count': entries.count(),
        'last_entry_date': last_entry.entry_date if last_entry else None,
        'last_payment': {
            'date': last_payment.entry_date,
            'amount': last_payment.amount,
            'receipt_number': last_payment.receipt_number,
        } if last_payment else None,
    }
