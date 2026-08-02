from datetime import datetime

from django.contrib.auth.models import User
from django.db.models import Max, Q, Sum
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserProfile
from activities.service import log as activity_log

from . import service
from .models import LedgerEntry
from .permissions import CanRecordPayment, CanViewLedger, CanVoidLedger
from .serializers import (
    LedgerEntrySerializer,
    ManualEntrySerializer,
    ReceivableSerializer,
    RecordPaymentSerializer,
    VoidEntrySerializer,
)
from .statement import build_statement, customer_summary

DEFAULT_LIMIT = 100
MAX_LIMIT = 500


def _parse_date(raw):
    if not raw:
        return None
    try:
        return datetime.strptime(raw, '%Y-%m-%d').date()
    except ValueError:
        return None


def _paginate(request, rows):
    """`{count, results}` with limit/offset — matches the activities app."""
    try:
        limit = min(int(request.query_params.get('limit', DEFAULT_LIMIT)), MAX_LIMIT)
    except (TypeError, ValueError):
        limit = DEFAULT_LIMIT
    try:
        offset = max(int(request.query_params.get('offset', 0)), 0)
    except (TypeError, ValueError):
        offset = 0
    return rows[offset:offset + limit], limit, offset


def _attach_pdf(response, filename):
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    # Without this the browser can't read the filename cross-origin, which is
    # what the web client's apiDownload helper relies on.
    response['Access-Control-Expose-Headers'] = 'Content-Disposition'
    return response


# ─── Public business contact ─────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def business_info(request):
    """
    Business name, phone and address for the customer-facing "contact us"
    button. Public on purpose — it is the same information printed on every
    receipt — and served from the database so the number can be changed from
    the admin panel without shipping a new app build.
    """
    from .models import LedgerSettings

    cfg = LedgerSettings.load()
    return Response({
        'name': cfg.business_name,
        'phone': cfg.business_phone,
        'address': cfg.business_address,
    })


# ─── Receivables ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([CanViewLedger])
def receivables(request):
    """Every customer with a ledger presence, most-owing first."""
    search = (request.query_params.get('search') or '').strip()
    only_owing = (request.query_params.get('only_owing') or '').lower() in ('1', 'true', 'yes')

    totals = {
        row['customer_id']: row
        for row in LedgerEntry.objects.values('customer_id').annotate(
            amount=Sum('amount'), out=Sum('bottles_out'), inn=Sum('bottles_in'),
        )
    }

    profiles = (
        UserProfile.objects.filter(user_type='customer')
        .select_related('user')
    )
    if search:
        profiles = profiles.filter(
            Q(user__username__icontains=search)
            | Q(user__first_name__icontains=search)
            | Q(user__last_name__icontains=search)
            | Q(phone_number__icontains=search)
            | Q(address__icontains=search)
            | Q(customer_code__icontains=search)
        )

    # Last-activity dates for everyone in two queries rather than two per row.
    last_entry_dates = {
        row['customer_id']: row['last']
        for row in LedgerEntry.objects.values('customer_id').annotate(last=Max('entry_date'))
    }
    last_payment_dates = {
        row['customer_id']: row['last']
        for row in LedgerEntry.objects
        .filter(entry_type__in=LedgerEntry.PAYMENT_TYPES)
        .values('customer_id').annotate(last=Max('entry_date'))
    }

    rows = []
    for profile in profiles:
        agg = totals.get(profile.user_id)
        balance = -(agg['amount'] if agg else 0)
        if only_owing and balance <= 0:
            continue
        rows.append({
            'id': profile.user_id,
            'username': profile.user.username,
            'name': profile.user.get_full_name() or profile.user.username,
            'customer_code': profile.customer_code,
            'phone': profile.phone_number,
            'address': profile.address,
            'balance': balance,
            'bottles_held': int((agg['out'] or 0) - (agg['inn'] or 0)) if agg else 0,
            'last_entry_date': last_entry_dates.get(profile.user_id),
            'last_payment_date': last_payment_dates.get(profile.user_id),
        })

    rows.sort(key=lambda r: r['balance'], reverse=True)
    page, limit, offset = _paginate(request, rows)
    return Response({
        'count': len(rows),
        'limit': limit,
        'offset': offset,
        'results': ReceivableSerializer(page, many=True).data,
    })


# ─── Statement ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([CanViewLedger])
def statement(request, user_id):
    customer = get_object_or_404(User, pk=user_id)
    data = build_statement(
        customer,
        start=_parse_date(request.query_params.get('start')),
        end=_parse_date(request.query_params.get('end')),
        entry_type=request.query_params.get('entry_type') or None,
        source=request.query_params.get('source') or None,
    )
    page, limit, offset = _paginate(request, data['rows'])
    profile = UserProfile.objects.filter(user=customer).first()

    return Response({
        'customer': {
            'id': customer.pk,
            'name': customer.get_full_name() or customer.username,
            'username': customer.username,
            'customer_code': getattr(profile, 'customer_code', None),
            'phone': getattr(profile, 'phone_number', None),
            'address': getattr(profile, 'address', None),
        },
        'period': data['period'],
        'opening_balance': data['opening_balance'],
        'closing_balance': data['closing_balance'],
        'opening_stock': data['opening_stock'],
        'closing_stock': data['closing_stock'],
        'totals': data['totals'],
        'count': data['count'],
        'limit': limit,
        'offset': offset,
        'results': LedgerEntrySerializer(page, many=True).data,
    })


@api_view(['GET'])
@permission_classes([CanViewLedger])
def summary(request, user_id):
    customer = get_object_or_404(User, pk=user_id)
    return Response(customer_summary(customer))


# ─── Writes ──────────────────────────────────────────────────────────────────

class RecordPaymentView(APIView):
    permission_classes = [CanRecordPayment]

    def post(self, request):
        payload = RecordPaymentSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        customer = get_object_or_404(User, pk=data['customer_id'])
        service.ensure_customer_code(customer)
        try:
            entry = service.record_payment(
                customer=customer,
                amount=data['amount'],
                payment_method=data['payment_method'],
                entry_date=data.get('entry_date'),
                reference=data.get('reference', ''),
                notes=data.get('notes', ''),
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        activity_log(
            request.user, 'customer', 'Payment Recorded',
            target_type='ledger_entry', target_id=entry.pk,
            target_label=entry.receipt_number,
            details={'customer': customer.username, 'amount': str(entry.amount)},
        )
        return Response(LedgerEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class ManualEntryView(APIView):
    permission_classes = [CanRecordPayment]

    def post(self, request):
        payload = ManualEntrySerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        data = payload.validated_data

        customer = get_object_or_404(User, pk=data['customer_id'])
        service.ensure_customer_code(customer)
        try:
            entry = service.post_manual(
                customer=customer,
                entry_type=data['entry_type'],
                amount=data['amount'],
                description=data['description'],
                entry_date=data.get('entry_date'),
                notes=data.get('notes', ''),
                bottles_out=data.get('bottles_out', 0),
                bottles_in=data.get('bottles_in', 0),
                actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        activity_log(
            request.user, 'customer', 'Ledger Entry Posted',
            target_type='ledger_entry', target_id=entry.pk,
            target_label=entry.get_entry_type_display(),
            details={'customer': customer.username, 'amount': str(entry.amount)},
        )
        return Response(LedgerEntrySerializer(entry).data, status=status.HTTP_201_CREATED)


class VoidEntryView(APIView):
    permission_classes = [CanVoidLedger]

    def post(self, request, pk):
        entry = get_object_or_404(LedgerEntry, pk=pk)
        payload = VoidEntrySerializer(data=request.data)
        payload.is_valid(raise_exception=True)

        try:
            reversal = service.void_entry(
                entry, reason=payload.validated_data['reason'], actor=request.user,
            )
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        activity_log(
            request.user, 'customer', 'Ledger Entry Voided',
            target_type='ledger_entry', target_id=entry.pk,
            target_label=entry.receipt_number or str(entry.pk),
            details={'reason': payload.validated_data['reason']},
        )
        return Response(LedgerEntrySerializer(reversal).data, status=status.HTTP_201_CREATED)


# ─── Documents ───────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([CanViewLedger])
def receipt_pdf(request, pk):
    from .pdf import render_receipt

    entry = get_object_or_404(LedgerEntry, pk=pk)
    if entry.entry_type not in LedgerEntry.PAYMENT_TYPES:
        return Response(
            {'detail': 'Receipts are only available for payment entries.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    pdf = render_receipt(entry)
    name = entry.receipt_number or f'entry-{entry.pk}'
    return _attach_pdf(
        HttpResponse(pdf, content_type='application/pdf'), f'receipt-{name}.pdf',
    )


@api_view(['GET'])
@permission_classes([CanViewLedger])
def statement_pdf(request, user_id):
    from .pdf import render_statement

    customer = get_object_or_404(User, pk=user_id)
    service.ensure_customer_code(customer)
    data = build_statement(
        customer,
        start=_parse_date(request.query_params.get('start')),
        end=_parse_date(request.query_params.get('end')),
        entry_type=request.query_params.get('entry_type') or None,
        source=request.query_params.get('source') or None,
    )
    pdf = render_statement(data)
    period = data['period']
    suffix = f"{period['start'] or 'all'}_to_{period['end'] or 'date'}"
    return _attach_pdf(
        HttpResponse(pdf, content_type='application/pdf'),
        f'statement-{customer.username}-{suffix}.pdf',
    )
