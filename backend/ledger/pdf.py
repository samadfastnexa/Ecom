"""
ReportLab documents: the Detail Ledger statement and the payment receipt.

Both return raw bytes so they can be unit-tested without going through HTTP.

Layout follows the printed ledger the business already uses: arrears at the top,
dated rows carrying a running balance, a totals line, and the remaining balance
and bottle stock boxed at the bottom.
"""

import os
from decimal import Decimal

from django.conf import settings
from django.utils import timezone
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

from .models import LedgerSettings

ZERO = Decimal('0')
BRAND = colors.HexColor('#0A84FF')
MUTED = colors.HexColor('#666666')
RULE = colors.HexColor('#CCCCCC')

FONT = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'


def _register_fonts():
    """
    Swap in DejaVu when it is available. ReportLab's built-in Type1 fonts are
    Latin-1 only, so a customer name containing Urdu or other non-Latin text
    would otherwise render as black boxes.

    Note this gives coverage, not shaping — proper Urdu still needs
    arabic-reshaper + python-bidi.
    """
    global FONT, FONT_BOLD
    base = os.path.join(settings.BASE_DIR, 'static', 'fonts')
    regular = os.path.join(base, 'DejaVuSans.ttf')
    bold = os.path.join(base, 'DejaVuSans-Bold.ttf')
    if os.path.exists(regular) and os.path.exists(bold):
        try:
            pdfmetrics.registerFont(TTFont('DejaVuSans', regular))
            pdfmetrics.registerFont(TTFont('DejaVuSans-Bold', bold))
            FONT, FONT_BOLD = 'DejaVuSans', 'DejaVuSans-Bold'
        except Exception:  # pragma: no cover — corrupt font file
            pass


_register_fonts()


def money(value):
    """1950 -> '1,950.00'; zero renders as a dash, as on the printed ledger."""
    value = Decimal(value or 0)
    if value == ZERO:
        return '-'
    return f'{value:,.2f}'


def _num(value):
    if value in (None, ''):
        return '-'
    value = Decimal(value)
    if value == value.to_integral_value():
        return f'{int(value)}'
    return f'{value:,.2f}'


# ─── Amount in words (Pakistani convention) ──────────────────────────────────

_ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight',
         'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
         'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
_TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy',
         'Eighty', 'Ninety']


def _under_thousand(n):
    if n < 20:
        return _ONES[n]
    if n < 100:
        return (_TENS[n // 10] + (' ' + _ONES[n % 10] if n % 10 else '')).strip()
    return (_ONES[n // 100] + ' Hundred'
            + (' ' + _under_thousand(n % 100) if n % 100 else ''))


def amount_in_words(value):
    """Rupees in the lakh/crore system used locally."""
    value = Decimal(value or 0)
    negative = value < ZERO
    value = abs(value)
    rupees = int(value)
    paisa = int((value - rupees) * 100)

    if rupees == 0:
        words = 'Zero'
    else:
        parts = []
        for divisor, label in ((10_000_000, 'Crore'), (100_000, 'Lakh'), (1_000, 'Thousand')):
            if rupees >= divisor:
                parts.append(f'{_under_thousand(rupees // divisor)} {label}')
                rupees %= divisor
        if rupees:
            parts.append(_under_thousand(rupees))
        words = ' '.join(parts)

    text = f'Rupees {words}'
    if paisa:
        text += f' and {_under_thousand(paisa)} Paisa'
    if negative:
        text = f'Minus {text}'
    return text + ' Only'


# ─── Shared chrome ───────────────────────────────────────────────────────────

def _styles():
    base = getSampleStyleSheet()
    return {
        'title': ParagraphStyle('t', parent=base['Title'], fontName=FONT_BOLD,
                                fontSize=18, textColor=BRAND, spaceAfter=2),
        'sub': ParagraphStyle('s', parent=base['Normal'], fontName=FONT,
                              fontSize=9, textColor=MUTED, alignment=TA_CENTER),
        'doc': ParagraphStyle('d', parent=base['Normal'], fontName=FONT_BOLD,
                              fontSize=14, alignment=TA_RIGHT),
        'body': ParagraphStyle('b', parent=base['Normal'], fontName=FONT, fontSize=9),
        'small': ParagraphStyle('sm', parent=base['Normal'], fontName=FONT,
                                fontSize=7.5, textColor=MUTED),
        'label': ParagraphStyle('l', parent=base['Normal'], fontName=FONT_BOLD, fontSize=9),
    }


def _business_header(story, st, doc_title):
    cfg = LedgerSettings.load()
    story.append(Paragraph(cfg.business_name or 'Century Sip', st['title']))
    if cfg.business_address:
        story.append(Paragraph(cfg.business_address.replace('\n', '<br/>'), st['sub']))
    if cfg.business_phone:
        story.append(Paragraph(cfg.business_phone, st['sub']))
    story.append(Spacer(1, 6))
    story.append(Paragraph(doc_title, st['doc']))
    story.append(Spacer(1, 8))
    return cfg


def _footer(canvas, doc):
    canvas.saveState()
    canvas.setFont(FONT, 7)
    canvas.setFillColor(MUTED)
    printed = timezone.localtime().strftime('%d-%b-%Y %I:%M %p')
    canvas.drawString(15 * mm, 10 * mm, f'Print Date: {printed}')
    canvas.drawRightString(A4[0] - 15 * mm, 10 * mm, f'Page {canvas.getPageNumber()}')
    canvas.restoreState()


def _build(story, on_page=_footer, pagesize=A4, **margins):
    from io import BytesIO
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=pagesize,
        leftMargin=margins.get('left', 15 * mm),
        rightMargin=margins.get('right', 15 * mm),
        topMargin=margins.get('top', 14 * mm),
        bottomMargin=margins.get('bottom', 18 * mm),
    )
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    return buf.getvalue()


# ─── Detail Ledger statement ─────────────────────────────────────────────────

def render_statement(data):
    st = _styles()
    story = []
    _business_header(story, st, 'Detail Ledger')

    customer = data['customer']
    profile = getattr(customer, 'profile', None)
    period = data['period']
    period_text = (
        f"{period['start'].strftime('%d-%b-%Y') if period['start'] else 'Beginning'}"
        f"   To:   {period['end'].strftime('%d-%b-%Y') if period['end'] else 'Date'}"
    )

    meta = Table([
        ['Customer:', customer.get_full_name() or customer.username, '', period_text],
        ['Code:', getattr(profile, 'customer_code', '') or '-', 'Arrears:', money(data['opening_balance'])],
        ['Phone No:', getattr(profile, 'phone_number', '') or '-', 'Prev. Stock:', str(data['opening_stock'])],
    ], colWidths=[22 * mm, 78 * mm, 32 * mm, 48 * mm])
    meta.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), FONT_BOLD),
        ('FONTNAME', (1, 0), (1, -1), FONT_BOLD),
        ('FONTNAME', (2, 0), (2, -1), FONT_BOLD),
        ('FONTNAME', (3, 0), (3, -1), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
        ('ALIGN', (3, 0), (3, -1), 'RIGHT'),
        ('BOX', (3, 1), (3, 1), 0.6, colors.black),
        ('BOX', (3, 2), (3, 2), 0.6, colors.black),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LINEBELOW', (1, 0), (1, 0), 0.6, colors.black),
    ]))
    story.append(meta)
    story.append(Spacer(1, 8))

    header = ['Sr', 'Date', 'Bill', 'Items', 'Price', 'QTY', 'Empty',
              'Gross', 'Disc', 'Debit', 'Credit', 'Balance']
    rows = [header]
    for i, entry in enumerate(data['rows'], start=1):
        items_text = (entry.item_label or entry.description or '')
        # The charge document must name the discount: "Discount (Wholesale)".
        if entry.discount_amount and entry.discount_category_name:
            items_text = f'{items_text} · Disc ({entry.discount_category_name})'
        rows.append([
            str(i),
            entry.entry_date.strftime('%d-%b-%Y'),
            entry.document_label,
            items_text[:38],
            money(entry.unit_price) if entry.unit_price else '-',
            _num(entry.quantity),
            str(entry.bottles_in) if entry.bottles_in else '-',
            # money() renders None/zero as a dash, so undiscounted rows keep
            # these columns blank rather than showing 0.00.
            money(entry.gross_amount),
            money(entry.discount_amount),
            money(entry.debit),
            money(entry.credit),
            money(entry.running_balance),
        ])

    if not data['rows']:
        rows.append(['', '', '', 'No entries for this period.',
                     '', '', '', '', '', '', '', ''])

    totals = data['totals']
    rows.append([
        '', '', '', '', '',
        _num(totals['quantity']), str(totals['bottles_in']),
        money(totals.get('gross')), money(totals.get('discount')),
        money(totals['debit']), money(totals['credit']), '',
    ])

    table = Table(
        rows, repeatRows=1,
        colWidths=[8 * mm, 19 * mm, 22 * mm, 34 * mm, 13 * mm, 10 * mm,
                   11 * mm, 18 * mm, 16 * mm, 19 * mm, 19 * mm, 20 * mm],
    )
    table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, 0), FONT_BOLD),
        ('FONTNAME', (0, 1), (-1, -1), FONT),
        ('FONTNAME', (0, -1), (-1, -1), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('ALIGN', (4, 0), (-1, -1), 'RIGHT'),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('LINEBELOW', (0, 0), (-1, 0), 0.8, colors.black),
        ('LINEBELOW', (0, 1), (-1, -2), 0.25, RULE),
        ('LINEABOVE', (0, -1), (-1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 3),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
    ]))
    story.append(table)
    story.append(Spacer(1, 10))

    closing = Table([
        ['Remaining Balance:', money(data['closing_balance'])],
        ['Current Stock:', str(data['closing_stock'])],
    ], colWidths=[44 * mm, 32 * mm], hAlign='RIGHT')
    closing.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('BOX', (1, 0), (1, 0), 0.6, colors.black),
        ('BOX', (1, 1), (1, 1), 0.6, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(closing)

    story.append(Spacer(1, 26))
    sign = Table([['', '____________________'], ['', 'Accounts Office']],
                 colWidths=[110 * mm, 50 * mm])
    sign.setStyle(TableStyle([
        ('FONTNAME', (1, 1), (1, 1), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    story.append(sign)

    return _build(story)


# ─── Payment receipt ─────────────────────────────────────────────────────────

def render_receipt(entry):
    st = _styles()
    story = []
    cfg = _business_header(story, st, 'Payment Receipt')

    customer = entry.customer
    profile = getattr(customer, 'profile', None)
    balance_before = -(entry.balance_after - entry.amount)
    balance_after = -entry.balance_after

    head = Table([
        ['Receipt No:', entry.receipt_number or f'#{entry.pk}',
         'Date:', entry.entry_date.strftime('%d-%b-%Y')],
        ['Customer:', customer.get_full_name() or customer.username,
         'Issued:', timezone.localtime(entry.created_at).strftime('%d-%b-%Y %I:%M %p')],
        ['Code:', getattr(profile, 'customer_code', '') or '-',
         'Method:', entry.payment_method or 'Cash'],
        ['Phone:', getattr(profile, 'phone_number', '') or '-',
         'Reference:', entry.reference or '-'],
    ], colWidths=[26 * mm, 62 * mm, 26 * mm, 66 * mm])
    head.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), FONT_BOLD),
        ('FONTNAME', (2, 0), (2, -1), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(head)
    story.append(Spacer(1, 10))

    amount = Table([
        ['Amount Received', money(entry.amount)],
        ['In Words', amount_in_words(entry.amount)],
    ], colWidths=[42 * mm, 138 * mm])
    amount.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), FONT_BOLD),
        ('FONTNAME', (1, 0), (1, 0), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, 0), 13),
        ('FONTSIZE', (0, 1), (-1, 1), 9),
        ('TEXTCOLOR', (1, 0), (1, 0), BRAND),
        ('BOX', (0, 0), (-1, -1), 0.8, colors.black),
        ('INNERGRID', (0, 0), (-1, -1), 0.4, RULE),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(amount)
    story.append(Spacer(1, 10))

    balances = Table([
        ['Balance before', money(balance_before)],
        ['This payment', money(-entry.amount)],
        ['Balance after', money(balance_after)],
    ], colWidths=[42 * mm, 40 * mm], hAlign='RIGHT')
    balances.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (-1, -1), FONT),
        ('FONTNAME', (0, -1), (-1, -1), FONT_BOLD),
        ('FONTSIZE', (0, 0), (-1, -1), 9.5),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEABOVE', (0, -1), (-1, -1), 0.8, colors.black),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
    ]))
    story.append(balances)

    if entry.notes:
        story.append(Spacer(1, 8))
        story.append(Paragraph(f'<b>Notes:</b> {entry.notes}', st['body']))

    story.append(Spacer(1, 22))
    issued_by = (entry.created_by.get_full_name() or entry.created_by.username) \
        if entry.created_by else 'System'
    sign = Table([[f'Issued by: {issued_by}', '____________________'],
                  ['', 'Accounts Office']], colWidths=[110 * mm, 50 * mm])
    sign.setStyle(TableStyle([
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (1, 1), (1, 1), FONT_BOLD),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    story.append(KeepTogether(sign))

    story.append(Spacer(1, 12))
    footer_text = cfg.receipt_footer or ''
    story.append(Paragraph(
        f'{footer_text}<br/>System generated — no signature required.', st['small'],
    ))

    voided = entry.is_reversed

    def page_furniture(canvas, doc):
        if voided:
            _void_watermark(canvas)
        _footer(canvas, doc)

    return _build(story, on_page=page_furniture)


def _void_watermark(canvas):
    """A reprint of a reversed receipt must be unmistakably void."""
    canvas.saveState()
    canvas.setFont(FONT_BOLD, 90)
    canvas.setFillColor(colors.Color(1, 0, 0, alpha=0.18))
    canvas.translate(A4[0] / 2, A4[1] / 2)
    canvas.rotate(35)
    canvas.drawCentredString(0, 0, 'VOID')
    canvas.restoreState()
