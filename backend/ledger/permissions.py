"""
Ledger access. Money gets its own permissions rather than riding on the plant
ones — a user who can log bottle deliveries should not automatically be able to
write off a customer's debt.

Nothing here ever derives the customer from request.user: the ledger is an
admin tool, and a customer must not be able to read their own statement through
these endpoints.
"""

from rest_framework.permissions import BasePermission


class _LedgerPermission(BasePermission):
    perm = ''

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return bool(user.is_superuser or user.is_staff or user.has_perm(self.perm))


class CanViewLedger(_LedgerPermission):
    perm = 'ledger.view_ledgerentry'


class CanRecordPayment(_LedgerPermission):
    perm = 'ledger.add_ledgerentry'


class CanVoidLedger(_LedgerPermission):
    perm = 'ledger.delete_ledgerentry'
