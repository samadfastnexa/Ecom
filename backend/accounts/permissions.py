"""
The discount-override capability.

Unlike the plant/ledger permission classes, is_staff alone deliberately does
NOT pass here: any staff member can bill, but only specifically trusted staff
may move money off the automatically-applied discount. Grant the permission
per staff user (user_permissions or a group) exactly as the plant and ledger
permissions are granted; superusers pass has_perm() implicitly.
"""


def user_can_override_discount(user):
    return bool(
        user
        and user.is_authenticated
        and (user.is_superuser or user.has_perm('accounts.can_override_discount'))
    )
